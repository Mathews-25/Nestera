#![cfg(test)]

use super::*;
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn test_user_instantiation() {
    let user = User {
        total_balance: 1_000_000,
        savings_count: 3,
    };
    
    assert_eq!(user.total_balance, 1_000_000);
    assert_eq!(user.savings_count, 3);
}

#[test]
fn test_flexi_savings_plan() {
    let plan = SavingsPlan {
        plan_id: 1,
        plan_type: PlanType::Flexi,
        balance: 500_000,
        start_time: 1000000,
        last_deposit: 1000100,
        last_withdraw: 0,
        interest_rate: 500, // 5.00% APY
        is_completed: false,
    };
    
    assert_eq!(plan.plan_id, 1);
    assert_eq!(plan.plan_type, PlanType::Flexi);
    assert_eq!(plan.balance, 500_000);
    assert!(!plan.is_completed);
}

#[test]
fn test_lock_savings_plan() {
    let locked_until = 2000000;
    let plan = SavingsPlan {
        plan_id: 2,
        plan_type: PlanType::Lock(locked_until),
        balance: 1_000_000,
        start_time: 1000000,
        last_deposit: 1000000,
        last_withdraw: 0,
        interest_rate: 800,
        is_completed: false,
    };
    
    assert_eq!(plan.plan_id, 2);
    match plan.plan_type {
        PlanType::Lock(until) => assert_eq!(until, locked_until),
        _ => panic!("Expected Lock plan type"),
    }
}

#[test]
fn test_goal_savings_plan() {
    let plan = SavingsPlan {
        plan_id: 3,
        plan_type: PlanType::Goal(
            symbol_short!("education"),
            5_000_000,
            1u32, // e.g. 1 = weekly
        ),
        balance: 2_000_000,
        start_time: 1000000,
        last_deposit: 1500000,
        last_withdraw: 0,
        interest_rate: 600,
        is_completed: false,
    };
    
    assert_eq!(plan.plan_id, 3);
    match plan.plan_type {
        PlanType::Goal(category, target_amount, contribution_type) => {
            assert_eq!(category, symbol_short!("education"));
            assert_eq!(target_amount, 5_000_000);
            assert_eq!(contribution_type, 1u32);
        },
        _ => panic!("Expected Goal plan type"),
    }
}

#[test]
fn test_group_savings_plan() {
    let plan = SavingsPlan {
        plan_id: 4,
        plan_type: PlanType::Group(
            101,
            true,
            2u32,
            10_000_000
        ),
        balance: 3_000_000,
        start_time: 1000000,
        last_deposit: 1600000,
        last_withdraw: 0,
        interest_rate: 700,
        is_completed: false,
    };
    
    assert_eq!(plan.plan_id, 4);
    match plan.plan_type {
        PlanType::Group(group_id, is_public, contribution_type, target_amount) => {
            assert_eq!(group_id, 101);
            assert!(is_public);
            assert_eq!(contribution_type, 2u32);
            assert_eq!(target_amount, 10_000_000);
        },
        _ => panic!("Expected Group plan type"),
    }
}

#[test]
fn test_data_key_admin() {
    let key = DataKey::Admin;
    assert_eq!(key, DataKey::Admin);
}

#[test]
fn test_data_key_user() {
    let env = Env::default();
    let user_address = Address::generate(&env);
    let key = DataKey::User(user_address.clone());
    
    match key {
        DataKey::User(addr) => assert_eq!(addr, user_address),
        _ => panic!("Expected User data key"),
    }
}

#[test]
fn test_data_key_savings_plan() {
    let env = Env::default();
    let user_address = Address::generate(&env);
    let plan_id = 42;
    let key = DataKey::SavingsPlan(user_address.clone(), plan_id);
    
    match key {
        DataKey::SavingsPlan(addr, id) => {
            assert_eq!(addr, user_address);
            assert_eq!(id, plan_id);
        },
        _ => panic!("Expected SavingsPlan data key"),
    }
}

#[test]
fn test_xdr_compatibility_user() {
    let env = Env::default();
    let contract_id = env.register(NesteraContract, ());

    let user = User {
        total_balance: 1_500_000,
        savings_count: 5,
    };

    let key = symbol_short!("testuser");
    env.as_contract(&contract_id, || {
        env.storage().instance().set(&key, &user);
        let retrieved_user: User = env.storage().instance().get(&key).unwrap();
        assert_eq!(user, retrieved_user);
    });
}

#[test]
fn test_xdr_compatibility_savings_plan() {
    let env = Env::default();
    let contract_id = env.register(NesteraContract, ());
    
    let plan = SavingsPlan {
        plan_id: 1,
        plan_type: PlanType::Flexi,
        balance: 750_000,
        start_time: 1000000,
        last_deposit: 1100000,
        last_withdraw: 1050000,
        interest_rate: 550,
        is_completed: false,
    };
    
    let key = symbol_short!("testplan");
    env.as_contract(&contract_id, || {
        env.storage().instance().set(&key, &plan);
        let retrieved_plan: SavingsPlan = env.storage().instance().get(&key).unwrap();
        assert_eq!(plan, retrieved_plan);
    });
}

fn test_xdr_compatibility_all_plan_types() {
    let env = Env::default();
    let contract_id = env.register(NesteraContract, ());
    
    env.as_contract(&contract_id, || {
        // Test Flexi
        let flexi_plan = SavingsPlan {
            plan_id: 0,
            plan_type: PlanType::Flexi,
            balance: 1_000_000,
            start_time: 1000000,
            last_deposit: 1100000,
            last_withdraw: 0,
            interest_rate: 500,
            is_completed: false,
        };
        env.storage().instance().set(&0u32, &flexi_plan);
        let retrieved: SavingsPlan = env.storage().instance().get(&0u32).unwrap();
        assert_eq!(flexi_plan, retrieved);
        
        // Test Lock
        let lock_plan = SavingsPlan {
            plan_id: 1,
            plan_type: PlanType::Lock(2000000),
            balance: 1_000_000,
            start_time: 1000000,
            last_deposit: 1100000,
            last_withdraw: 0,
            interest_rate: 500,
            is_completed: false,
        };
        env.storage().instance().set(&1u32, &lock_plan);
        let retrieved: SavingsPlan = env.storage().instance().get(&1u32).unwrap();
        assert_eq!(lock_plan, retrieved);
        
        // Test Goal
        let goal_plan = SavingsPlan {
            plan_id: 2,
            plan_type: PlanType::Goal(
                symbol_short!("vacation"),
                3_000_000,
                1u32
            ),
            balance: 1_000_000,
            start_time: 1000000,
            last_deposit: 1100000,
            last_withdraw: 0,
            interest_rate: 500,
            is_completed: false,
        };
        env.storage().instance().set(&2u32, &goal_plan);
        let retrieved: SavingsPlan = env.storage().instance().get(&2u32).unwrap();
        assert_eq!(goal_plan, retrieved);
        
        // Test Group
        let group_plan = SavingsPlan {
            plan_id: 3,
            plan_type: PlanType::Group(
                200,
                false,
                3u32,
                8_000_000
            ),
            balance: 1_000_000,
            start_time: 1000000,
            last_deposit: 1100000,
            last_withdraw: 0,
            interest_rate: 500,
            is_completed: false,
        };
        env.storage().instance().set(&3u32, &group_plan);
        let retrieved: SavingsPlan = env.storage().instance().get(&3u32).unwrap();
        assert_eq!(group_plan, retrieved);
    });
}
