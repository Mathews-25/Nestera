use soroban_sdk::{contracttype, contracterror, Address};

/// Global error enum for the savings contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SavingsError {
    /// User already exists in the system
    DuplicateUser = 1,
    /// User not found in storage
    UserNotFound = 2,
    /// Unauthorized action
    Unauthorized = 3,
}

/// Storage keys for contract data
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// User data stored by address
    User(Address),
}

/// User account data structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct User {
    /// Total balance across all savings
    pub total_balance: i128,
    /// Number of active savings accounts
    pub savings_count: u32,
}

impl User {
    /// Create a new user with zero balances
    pub fn new() -> Self {
        User {
            total_balance: 0,
            savings_count: 0,
        }
    }
}

impl Default for User {
    fn default() -> Self {
        Self::new()
    }
}
