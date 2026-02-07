export async function logActivity(supabase, payload) {
  return supabase.from("activity_logs").insert({
    log_type: "activity",

    action: payload.action,
    user_id: payload.user_id,
    user_name: payload.user_name,

    category: payload.category ?? "normal",
    status: payload.status ?? "success",

    entity_type: payload.entity_type,
    entity_id: payload.entity_id,

    detail: payload.detail,
    meta: payload.meta
  });
}

export async function logRevision(supabase, payload) {
  return supabase.from("activity_logs").insert({
    log_type: "revision",

    action: payload.action,
    user_id: payload.user_id,
    user_name: payload.user_name,

    category: payload.category ?? "normal",
    status: payload.status ?? "success",

    entity_type: payload.entity_type,
    entity_id: payload.entity_id,

    changes: payload.changes
  });
}