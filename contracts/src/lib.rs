#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env};

pub mod storage_types;
pub mod users;

pub use storage_types::{DataKey, SavingsError, User};

#[contract]
pub struct NesteraContract;

// This is a sample contract. Replace this placeholder with your own contract logic.
// A corresponding test example is available in `test.rs`.
//
// For comprehensive examples, visit <https://github.com/stellar/soroban-examples>.
// The repository includes use cases for the Stellar ecosystem, such as data storage on
// the blockchain, token swaps, liquidity pools, and more.
//
// Refer to the official documentation:
// <https://developers.stellar.org/docs/build/smart-contracts/overview>.
#[contractimpl]
impl NesteraContract {
    /// Initialize a new user in the savings contract
    pub fn initialize_user(env: Env, user: Address) -> Result<(), SavingsError> {
        users::initialize_user(&env, user)
    }

    /// Check if a user exists in the contract
    pub fn user_exists(env: Env, user: Address) -> bool {
        users::user_exists(&env, &user)
    }

    /// Get user data from the contract
    pub fn get_user(env: Env, user: Address) -> Result<User, SavingsError> {
        users::get_user(&env, &user)
    }
}

mod test;
