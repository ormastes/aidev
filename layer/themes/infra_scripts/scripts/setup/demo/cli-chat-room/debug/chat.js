/**
 * Shared types for CLI chat room
 */
export var MessageType;
(function (MessageType) {
    MessageType["USER_MESSAGE"] = "user_message";
    MessageType["SYSTEM_MESSAGE"] = "system_message";
    MessageType["AGENT_MESSAGE"] = "agent_message";
    MessageType["USER_JOINED"] = "user_joined";
    MessageType["USER_LEFT"] = "user_left";
    MessageType["COMMAND"] = "command";
    MessageType["AGENT_ACTION"] = "agent_action";
})(MessageType || (MessageType = {}));
// WebSocket events
export var WSEventType;
(function (WSEventType) {
    // Client -> Server
    WSEventType["JOIN_ROOM"] = "join_room";
    WSEventType["LEAVE_ROOM"] = "leave_room";
    WSEventType["SEND_MESSAGE"] = "send_message";
    WSEventType["SEND_COMMAND"] = "send_command";
    // Server -> Client
    WSEventType["ROOM_STATE"] = "room_state";
    WSEventType["USER_JOINED"] = "user_joined";
    WSEventType["USER_LEFT"] = "user_left";
    WSEventType["NEW_MESSAGE"] = "new_message";
    WSEventType["ERROR"] = "error";
    // Agent specific
    WSEventType["AGENT_REQUEST"] = "agent_request";
    WSEventType["AGENT_RESPONSE"] = "agent_response";
})(WSEventType || (WSEventType = {}));
