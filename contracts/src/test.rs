#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env};

#[test]
fn test() {}

#[test]
fn test_initialize_user_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // User should not exist initially
    assert!(!client.user_exists(&user));

    // Initialize user
    let result = client.initialize_user(&user);
    assert_eq!(result, ());

    // User should now exist
    assert!(client.user_exists(&user));
}

#[test]
fn test_initialize_user_duplicate_returns_error() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // First initialization should succeed
    client.initialize_user(&user);

    // Second initialization should fail with DuplicateUser error
    let result = client.try_initialize_user(&user);
    assert_eq!(result, Err(Ok(SavingsError::DuplicateUser)));
}

#[test]
fn test_get_user_not_found() {
    let env = Env::default();

    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // Getting non-existent user should return UserNotFound error
    let result = client.try_get_user(&user);
    assert_eq!(result, Err(Ok(SavingsError::UserNotFound)));
}

#[test]
fn test_user_data_stored_correctly() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // Initialize user
    client.initialize_user(&user);

    // Get user and verify data
    let user_data = client.get_user(&user);
    assert_eq!(user_data.total_balance, 0);
    assert_eq!(user_data.savings_count, 0);
}
