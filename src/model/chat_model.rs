use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, sqlx::FromRow, Deserialize, Serialize)]
pub struct RawChatGroup {
    pub chat_id: i64,
    pub item_id: i64,
    pub other_user_id: i64,
    pub other_user_name: String,
    pub item_name: String,
    pub item_price: f64,
    pub item_category: String,
    pub item_description: Option<String>,
    pub item_status: String,
    pub item_image: Option<String>,
    pub last_message_content: Option<String>,
    pub last_message_sent_at: std::time::SystemTime,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ChatGroup {
    pub chat_id: i64,
    pub item_id: i64,
    pub other_user_id: i64,
    pub other_user_name: String,
    pub item_name: String,
    pub item_price: f64,
    pub item_category: String,
    pub item_description: Option<String>,
    pub item_status: String,
    pub item_image: Option<String>,
    pub last_message_content: Option<String>,
    pub last_message_sent_at: DateTime<Utc>,
}
