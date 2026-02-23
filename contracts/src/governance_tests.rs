#[cfg(test)]
mod governance_tests {

    use crate::rewards::storage_types::RewardsConfig;
    use crate::{NesteraContract, NesteraContractClient, PlanType};
    use soroban_sdk::{
        testutils::{Address as _, Events},
        Address, BytesN, Env, String, Symbol,
    };
    use crate::governance_events::{ProposalCreated, VoteCast}; // import the structs

    fn setup_contract() -> (Env, NesteraContractClient<'static>, Address) {
        let env = Env::default();
        let contract_id = env.register(NesteraContract, ());
        let client = NesteraContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let admin_pk = BytesN::from_array(&env, &[1u8; 32]);

        env.mock_all_auths();
        client.initialize(&admin, &admin_pk);

        let config = RewardsConfig {
            points_per_token: 10,
            streak_bonus_bps: 0,
            long_lock_bonus_bps: 0,
            goal_completion_bonus: 0,
            enabled: true,
            min_deposit_for_rewards: 0,
            action_cooldown_seconds: 0,
            max_daily_points: 1_000_000,
            max_streak_multiplier: 10_000,
        };
        client.initialize_rewards_config(&config);

        (env, client, admin)
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // Existing tests (kept unchanged)
    // ────────────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_voting_power_zero_for_new_user() {
        let (env, client, _) = setup_contract();
        let user = Address::generate(&env);

        let power = client.get_voting_power(&user);
        assert_eq!(power, 0);
    }

    #[test]
    fn test_voting_power_increases_with_deposits() {
        let (env, client, _) = setup_contract();
        let user = Address::generate(&env);
        env.mock_all_auths();

        client.initialize_user(&user);
        let _ = client.create_savings_plan(&user, &PlanType::Flexi, &1000);

        let power = client.get_voting_power(&user);
        assert_eq!(power, 1000);
    }

    #[test]
    fn test_voting_power_accumulates_across_deposits() {
        let (env, client, _) = setup_contract();
        let user = Address::generate(&env);
        env.mock_all_auths();

        client.initialize_user(&user);
        let _ = client.create_savings_plan(&user, &PlanType::Flexi, &1000);
        let _ = client.create_savings_plan(&user, &PlanType::Flexi, &500);

        let power = client.get_voting_power(&user);
        assert_eq!(power, 1500);
    }

    // ... keep your other existing tests ...

    // ────────────────────────────────────────────────────────────────────────────────
    // NEW TESTS: Governance Event Logging
    // ────────────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_proposal_created_emits_event() {
        let (env, client, admin) = setup_contract();
        env.mock_all_auths();

        client.init_voting_config(&admin, &5000, &604800, &86400, &100, &10_000);

        let creator = Address::generate(&env);
        let description = String::from_str(&env, "Test proposal description");

        let proposal_id = client
            .create_proposal(&creator, &description)
            .unwrap();

        // Check events
        let events = env.events().all();
        assert_eq!(events.len(), 1); // at least one event

        let event = &events[0];
        assert_eq!(event.topics.len(), 3);
        assert_eq!(event.topics[0], Symbol::new(&env, "gov"));
        assert_eq!(event.topics[1], Symbol::new(&env, "created"));
        assert_eq!(event.topics[2], creator.to_val());

        // Deserialize payload
        let payload: ProposalCreated = event.data.try_into().unwrap();
        assert_eq!(payload.proposal_id, proposal_id);
        assert_eq!(payload.creator, creator);
        assert_eq!(payload.description, description);
    }

    #[test]
    fn test_vote_cast_emits_event() {
        let (env, client, admin) = setup_contract();
        env.mock_all_auths();

        client.init_voting_config(&admin, &5000, &604800, &86400, &100, &10_000);

        let creator = Address::generate(&env);
        let voter = Address::generate(&env);

        // Give voter some power (deposit)
        client.initialize_user(&voter);
        client.create_savings_plan(&voter, &PlanType::Flexi, &10000);

        // Create proposal
        let proposal_id = client.create_proposal(&creator, &String::from_str(&env, "Vote test")).unwrap();

        // Cast vote
        client.vote(&proposal_id, &1, &voter).unwrap();

        // Check event
        let events = env.events().all();
        let vote_event = events.iter().find(|e| e.topics[1] == Symbol::new(&env, "voted")).unwrap();

        assert_eq!(vote_event.topics[0], Symbol::new(&env, "gov"));
        assert_eq!(vote_event.topics[1], Symbol::new(&env, "voted"));
        assert_eq!(vote_event.topics[2], voter.to_val());

        let payload: VoteCast = vote_event.data.try_into().unwrap();
        assert_eq!(payload.proposal_id, proposal_id);
        assert_eq!(payload.voter, voter);
        assert_eq!(payload.vote_type, 1); // for vote
        assert!(payload.weight > 0);
    }

    // Add similar tests for queue, execute, cancel if you implement cancel_proposal
}