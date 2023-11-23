use serde_json::Value;
use sqlx::{Executor, Postgres};

use crate::{
    error::DbError,
    model::item_model::{Category, Item, ItemStatus},
};

pub async fn fetch_items_by_status(
    status: ItemStatus,
    conn: impl Executor<'_, Database = Postgres>,
) -> Result<Vec<Item>, DbError> {
    let items = sqlx::query_as!(
        Item,
        r#"
        SELECT
            item.id, 
            item.name, 
            item.price, 
            item.user_id, 
            item.category::TEXT AS "category!",
            item.status::TEXT AS "status!",
            item.created_at, 
            item.description,
            item.updated_at,
            item.images as images
        FROM item
        WHERE item.status = $1
        ORDER BY item.created_at DESC
        "#,
        status as ItemStatus
    )
    .fetch_all(conn)
    .await?;

    Ok(items)
}

pub async fn fetch_items_by_category(
    category: Category,
    conn: impl Executor<'_, Database = Postgres>,
) -> Result<Vec<Item>, DbError> {
    let items = sqlx::query_as!(
        Item,
        r#"
        SELECT
            Item.id,
            Item.name, 
            Item.price, 
            Item.user_id, 
            Item.category::TEXT AS "category!",
            Item.status::TEXT AS "status!",
            Item.description,
            Item.created_at, 
            Item.updated_at,
            Item.images as images
        FROM Item 
        WHERE Item.category = $1 AND Item.status = 'active'
        ORDER BY Item.created_at DESC
        "#,
        category as Category
    )
    .fetch_all(conn)
    .await?;

    Ok(items)
}

pub async fn fetch_item_by_id(
    id: i32,
    conn: impl Executor<'_, Database = Postgres>,
) -> Result<Item, DbError> {
    let item = sqlx::query_as!(
        Item,
        r#"
            SELECT
                Item.id, 
                Item.name, 
                Item.price, 
                Item.user_id, 
                Item.category::TEXT as "category!",
                Item.status::TEXT as "status!",
                Item.description,
                Item.created_at, 
                Item.updated_at,
                Item.images as images
            FROM Item
            WHERE Item.id = $1
        "#,
        id
    )
    .fetch_one(conn)
    .await?;

    Ok(item)
}

pub async fn fetch_items_by_user_id(
    user_id: i32,
    conn: impl Executor<'_, Database = Postgres>,
) -> Result<Vec<Item>, DbError> {
    let items = sqlx::query_as!(
        Item,
        r#"
        SELECT
            Item.id, 
            Item.name, 
            Item.price, 
            Item.user_id, 
            Item.category::TEXT AS "category!",
            Item.status::TEXT AS "status!",
            Item.description,
            Item.created_at, 
            Item.updated_at,
            Item.images as images
        FROM Item
        WHERE Item.user_id = $1
        ORDER BY Item.created_at DESC
        "#,
        user_id
    )
    .fetch_all(conn)
    .await?;

    Ok(items)
}

pub async fn fetch_items_by_user_id_and_status(
    user_id: i32,
    status: ItemStatus,
    conn: impl Executor<'_, Database = Postgres>,
) -> Result<Vec<Item>, DbError> {
    let items = sqlx::query_as!(
        Item,
        r#"
        SELECT
            Item.id, 
            Item.name, 
            Item.price, 
            Item.user_id, 
            Item.category::TEXT AS "category!",
            Item.status::TEXT AS "status!",
            Item.description,
            Item.created_at, 
            Item.updated_at,
            Item.images as images
        FROM Item
        WHERE Item.user_id = $1 AND Item.status = $2
        ORDER BY Item.created_at DESC
        "#,
        user_id,
        status as ItemStatus
    )
    .fetch_all(conn)
    .await?;

    Ok(items)
}

pub async fn update_item_status(
    id: i32,
    status: ItemStatus,
    conn: impl Executor<'_, Database = Postgres>,
) -> Result<(), DbError> {
    sqlx::query!(
        r#"
        UPDATE Item
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        "#,
        status as ItemStatus,
        id
    )
    .execute(conn)
    .await?;

    Ok(())
}

pub async fn insert_item(
    user_id: i32,
    name: String,
    price: f64,
    category: Category,
    description: String,
    images: Vec<String>,
    conn: impl Executor<'_, Database = Postgres>,
) -> Result<i32, DbError> {
    let result = sqlx::query!(
        r#"
        INSERT INTO Item (name, price, user_id, category, description, images)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#,
        name,
        price,
        user_id,
        category as Category,
        description,
        Value::from(images)
    )
    .fetch_one(conn)
    .await?;

    Ok(result.id)
}
