use actix_web::{get, post, web, HttpResponse, Responder};
use serde::Deserialize;
use sqlx::PgPool;

use crate::{
    authentication::jwt::AuthenticationGuard,
    model::item_model::{Category, ItemStatus},
    repository::item_repository,
};

#[derive(Deserialize, Debug, Default)]
pub struct GetItemQuery {
    pub category: Option<String>,
    pub offset: Option<i32>,
    pub limit: Option<i32>,
}

#[get("/")]
async fn get_items_handler(
    pool: web::Data<PgPool>,
    query: web::Query<GetItemQuery>,
) -> impl Responder {
    // tracing::info!("query: {:#?}", query);

    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(25);

    let items = match &query.category {
        Some(category) if category == "all" => {
            item_repository::fetch_items_by_status(ItemStatus::Active, limit, offset, pool.as_ref())
                .await
        }
        Some(category) => {
            let category = match Category::from_str(category.as_str()) {
                Ok(category) => category,
                Err(_) => {
                    tracing::error!("API: Failed to parse category");
                    return HttpResponse::BadRequest().json(
                        serde_json::json!({"status": "fail", "data": "API: Invalid category"}),
                    );
                }
            };
            item_repository::fetch_items_by_category(category, limit, offset, pool.as_ref()).await
        }
        None => {
            item_repository::fetch_items_by_status(ItemStatus::Active, limit, offset, pool.as_ref())
                .await
        }
    };

    match items {
        Ok(items) => {
            HttpResponse::Ok().json(serde_json::json!({"status": "success", "data": items}))
        }
        Err(_) => {
            tracing::error!("API: Failed to fetch_all_items\n");
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"status": "fail", "data": "API: Something went wrong"}))
        }
    }
}

#[get("/{id}")]
async fn get_item_by_id_handler(path: web::Path<i32>, pool: web::Data<PgPool>) -> impl Responder {
    let item_id = path.into_inner();
    let item = item_repository::fetch_item_by_id(item_id, pool.as_ref()).await;

    match item {
        Ok(item) => HttpResponse::Ok().json(serde_json::json!({"status": "success", "data": item})),
        Err(err) => {
            tracing::error!(
                "{}\n",
                format!("API: Failed to fetch item with id {item_id}")
            );
            tracing::error!("Error message: {}\n", err);
            match err {
                crate::error::DbError::NotFound => HttpResponse::NotFound().json(serde_json::json!({"status": "fail", "data": format!("API: Could not find item with id {item_id}" )})),
                _ => HttpResponse::InternalServerError().json(serde_json::json!({"status": "fail", "data": "API: Something went wrong"}))
            }
        }
    }
}

#[derive(serde::Deserialize)]
struct ItemUpdateBody {
    status: Option<String>,
}

#[post("/{id}")]
async fn update_item_status_handler(
    auth_gaurd: AuthenticationGuard,
    path: web::Path<i32>,
    data: web::Json<ItemUpdateBody>,
    pool: web::Data<PgPool>,
) -> impl Responder {
    let item_id = path.into_inner();
    let user_id = auth_gaurd.user_id;

    let item = item_repository::fetch_item_by_id(item_id, pool.as_ref()).await;

    match item {
        Ok(item) => {
            if item.user_id != user_id {
                return HttpResponse::Unauthorized()
                    .json(serde_json::json!({"status": "fail", "data": "API: Unauthorized"}));
            }
        }
        Err(err) => {
            tracing::error!(
                "{}\n",
                format!("API: Failed to fetch item with id {item_id}")
            );
            tracing::error!("Error message: {}\n", err);
            match err {
                crate::error::DbError::NotFound => HttpResponse::NotFound().json(serde_json::json!({"status": "fail", "data": format!("API: Could not find item with id {item_id}" )})),
                _ => HttpResponse::InternalServerError().json(serde_json::json!({"status": "fail", "data": "API: Something went wrong"}))
            };
        }
    };

    let new_status = match &data.status {
        Some(status) => match ItemStatus::from_str(status.as_str()) {
            Ok(status) => status,
            Err(_) => {
                tracing::error!("API: Failed to parse status");
                return HttpResponse::BadRequest()
                    .json(serde_json::json!({"status": "fail", "data": "API: Invalid status"}));
            }
        },
        None => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"status": "fail", "data": "API: Missing status"}))
        }
    };

    let response = item_repository::update_item_status(item_id, new_status, pool.as_ref()).await;

    match response {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"status": "success"})),
        Err(err) => {
            tracing::error!(
                "{}\n",
                format!("API: Failed to update item with id {item_id}")
            );
            tracing::error!("Error message: {}\n", err);
            match err {
                crate::error::DbError::NotFound => HttpResponse::NotFound().json(serde_json::json!({"status": "fail", "data": format!("API: Could not find item with id {item_id}" )})),
                _ => HttpResponse::InternalServerError().json(serde_json::json!({"status": "fail", "data": "API: Something went wrong"}))
            }
        }
    }
}

// #[derive(Deserialize)]
// pub struct ItemCategoryQuery {
//     pub category: String,
//     // pub offset: Option<i32>,
//     // pub limit: Option<i32>,
// }

// #[get("/category/{category}")]
// async fn get_items_by_category_handler(
//     path: web::Path<String>,
//     pool: web::Data<PgPool>,
// ) -> impl Responder {
//     let category_string = path.into_inner();
//     let category = match Category::from_str(&category_string) {
//         Ok(category) => category,
//         Err(_) => {
//             tracing::error!("API: Failed to parse category");
//             return HttpResponse::BadRequest()
//                 .json(serde_json::json!({"status": "fail", "data": "API: Invalid category"}));
//         }
//     };

//     let items = item_repository::fetch_items_by_category(category, pool.as_ref()).await;

//     match items {
//         Ok(items) => {
//             HttpResponse::Ok().json(serde_json::json!({"status": "success", "data": items}))
//         }
//         Err(err) => {
//             tracing::error!(
//                 "{}\n",
//                 format!("API: Failed to fetch items with category {category_string}")
//             );
//             tracing::error!("Error message: {}\n", err);
//             HttpResponse::InternalServerError()
//                 .json(serde_json::json!({"status": "fail", "data": "API: Something went wrong"}))
//         }
//     }
// }

#[derive(serde::Deserialize)]
struct ItemCreateBody {
    name: String,
    price: f64,
    category: String,
    description: String,
    images: Vec<String>,
}

#[post("/")]
async fn post_item_handler(
    auth_gaurd: AuthenticationGuard,
    data: web::Json<ItemCreateBody>,
    pool: web::Data<PgPool>,
) -> impl Responder {
    let user_id = auth_gaurd.user_id;

    let item = data.into_inner();

    if item.name.is_empty() {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"status": "fail", "data": "API: Missing name"}));
    }

    let category = match Category::from_str(&item.category) {
        Ok(category) => category,
        Err(_) => {
            tracing::error!("API: Failed to parse category");
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"status": "fail", "data": "API: Invalid category"}));
        }
    };

    if item.price <= 0.0 {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"status": "fail", "data": "API: Invalid price"}));
    }

    let item_price = (item.price * 100.0).round() / 100.0;

    let response = item_repository::insert_item(
        user_id,
        item.name,
        item_price,
        category,
        item.description,
        item.images,
        pool.as_ref(),
    )
    .await;

    match response {
        Ok(item_id) => {
            tracing::info!("API: Successfully created item with id {}", item_id);
            return HttpResponse::Ok()
                .json(serde_json::json!({"status": "success", "data": item_id}));
        }
        Err(err) => {
            tracing::error!("API: Failed to create item");
            tracing::error!("Error message: {}\n", err);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"status": "fail", "data": "API: Something went wrong"}))
        }
    }
}
