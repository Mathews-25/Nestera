pub mod config;
pub mod ranking;
pub mod storage;
pub mod storage_types;

// Re-exporting these makes them accessible as crate::rewards::UserRewards
pub use config::*;
pub use storage_types::{RewardsDataKey, UserRewards}; // Optional: re-exports config functions

use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PointsAwardedEvent {
    pub user: Address,
    pub amount: u128,
}
