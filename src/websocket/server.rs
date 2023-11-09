use std::collections::{HashMap, HashSet};

use actix::{
    fut, prelude::ContextFutureSpawner, Actor, ActorFutureExt, Context, Handler, Message,
    MessageResult, Recipient, WrapFuture, AsyncContext, ResponseFuture,
};
use actix_web::web::Data;
use tokio::{runtime::Handle, sync::mpsc, task};
use uuid::Uuid;

use crate::{
    model::db_model::DbPool, repository::chat_repository::check_if_user_id_is_part_of_chat_group,
};

// chat server manages chat rooms and responsible for coordinating chat session
#[derive(Debug, Clone)]
pub struct ChatServer {
    sessions: HashMap<usize, (Recipient<ChatMessage>, Option<Uuid>)>, // maps session id to session address and the room id the session is in
    rooms: HashMap<Uuid, HashSet<usize>>, // maps room id to set of session ids in the room
    pool: Data<DbPool>,

    is_part: bool,
}

/// Make actor from `ChatServer`
impl Actor for ChatServer {
    /// We are going to use simple Context, we just need ability to communicate
    /// with other actors.
    type Context = Context<Self>;
}

impl ChatServer {
    pub fn new(pool: Data<DbPool>) -> ChatServer {
        ChatServer {
            sessions: HashMap::new(),
            rooms: HashMap::new(),
            pool,
            is_part: true,
        }
    }
}

impl ChatServer {
    fn distribute_message_in_room(&self, room_id: usize, message: &str, sender_id: usize) {
        todo!()
    }
}

/// Chat server sends this messages to session
#[derive(Message)]
#[rtype(result = "()")]
pub struct ChatMessage(pub String);

//  new chat session is created
#[derive(Message)]
#[rtype(result = "()")]
pub struct Connect {
    pub user_id: usize,
    pub addr: Recipient<ChatMessage>,
}

impl Handler<Connect> for ChatServer {
    type Result = ();

    fn handle(&mut self, msg: Connect, ctx: &mut Self::Context) -> Self::Result {
        // create a session id using the user_id and add to sessions

        self.sessions.insert(msg.user_id, (msg.addr, None));
    }
}

//  session is disconnected
#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
    pub user_id: usize,
}

impl Handler<Disconnect> for ChatServer {
    type Result = ();

    fn handle(&mut self, msg: Disconnect, _: &mut Self::Context) -> Self::Result {
        tracing::info!("Session with id {} disconnected", msg.user_id);

        match self.sessions.remove(&msg.user_id) {
            // if session is in a room, remove the session from the room
            Some((_, Some(room_id))) => match self.rooms.get_mut(&room_id) {
                Some(room) => {
                    match room.remove(&msg.user_id) {
                        // remove session from room
                        true => {
                            // if room is empty, remove room
                            if room.is_empty() {
                                self.rooms.remove(&room_id);
                            }
                        }
                        false => {
                            tracing::warn!(
                                "Session with id {} is in a room that does not exist",
                                msg.user_id
                            );
                        } // if session is not in room, do nothing. SHOULD NOT HAPPEN
                    }
                }
                None => {
                    tracing::warn!(
                        "Session with id {} is in a room that does not exist",
                        msg.user_id
                    );
                } // if room does not exist, do nothing. SHOULD NOT HAPPEN
            },
            Some((_, None)) => (), // if session is not in a room, do nothing
            None => {
                tracing::warn!("Session with id {} does not exist", msg.user_id);
            } // if session does not exist, do nothing. SHOULD NOT HAPPEN
        }
    }
}

//  session is disconnected #[derive(Message)]
pub struct Join {
    pub user_id: usize,
    pub chat_id: usize,
}

impl actix::Message for Join {
    type Result = bool;
}

impl Handler<Join> for ChatServer {
    type Result = MessageResult<Join>;

    fn handle(&mut self, msg: Join, ctx: &mut Self::Context) -> Self::Result {
        let pool = self.pool.clone();

        // do something async
        Box::pin(async move {
            let is_part_of_chat_group = check_if_user_id_is_part_of_chat_group(
                msg.user_id as i64,
                msg.chat_id as i64,
                pool.as_ref(),
            )
            .await;

            is_part_of_chat_group

        }).into_actor(self).then(
            |res, _, ctx| {
                // The `move` keyword is used to move `pool` into the closure.
                match res {
                    Ok(is_part_of_chat_group) => {
                        if !is_part_of_chat_group {
                            tracing::info!("is not part of chat group");
                        } else {
                            tracing::info!("is part of chat group");
                           
                        }
                    }
                    Err(err) => {
                        tracing::error!("Error message: {}\n", err);
                    }
                }
                fut::ready(())
            }
        ).wait(ctx);

        MessageResult(
            true
        )
            // match is_part_of_chat_group {
            //     Ok(is_part_of_chat_group) => {
            //         if !is_part_of_chat_group {
            //             tracing::info!("is not part of chat group");
            //             false
            //         } else {
            //             tracing::info!("is part of chat group");
                       
    }
}
// let stuff = check_if_user_id_is_part_of_chat_group(msg.user_id as i64, msg.chat_id as i64, self.pool.as_ref()).into_actor(self).then(
//     |res, _, ctx| {
//         // The `move` keyword is used to move `pool` into the closure.
//         match res {
//             Ok(is_part_of_chat_group) => {
//                 if !is_part_of_chat_group {

//                 }
//                 // Since pool was moved into the closure, it will be dropped here when no longer needed.
//             }
//             Err(err) => {
//                 tracing::error!("Error message: {}\n", err);

//             }
//         }
//         fut::ready(())
//     }
// ).spawn(ctx);

// Spawn a new async task to handle the future
// stuff
//     .then(|res, _, context| {
//         // The `move` keyword is used to move `pool` into the closure.
//         match res {
//             Ok(is_part_of_chat_group) => {
//                 if !is_part_of_chat_group {
//                     context.text("You are not part of this chat group".to_string());
//                 }
//                 // Since pool was moved into the closure, it will be dropped here when no longer needed.
//             }
//             Err(err) => {
//                 tracing::error!("Error message: {}\n", err);
//                 context.text("Something went wrong".to_string());
//             }
//         }
//         fut::ready(())
//     })
//     .spawn(ctx); // Use spawn instead of wait to avoid blocking the actor.
