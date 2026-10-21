/**
 * Maps Convex order docs (orders + orderItems) into the shape the kitchen,
 * admin and bill screens render. Keeps both the snake_case fields the KDS reads
 * and the camelCase fields the other screens read.
 */

const toItem = (it = {}) => {
  const quantity = Number(it.quantity ?? it.qty) || 1;
  const price = Number(it.price) || 0;
  const notes = it.note ?? it.notes ?? '';
  return {
    id: it._id ? String(it._id) : it.id,
    _id: it._id,
    name: it.name || it.item_name || 'Item',
    quantity,
    qty: quantity,
    price,
    notes,
    note: notes,
  };
};

export function mapConvexOrder(doc) {
  if (!doc) return null;
  const id = String(doc._id ?? doc.id ?? '');
  const items = (Array.isArray(doc.items) ? doc.items : []).map(toItem);
  const total = Number(doc.totalAmount ?? doc.total_amount ?? doc.total) || 0;
  const createdAt = doc.createdAt ?? doc.created_at ?? null;
  const notes = doc.generalNote ?? doc.notes ?? doc.note ?? '';
  const voiceUrl = doc.voiceNoteUrl ?? doc.voice_note_url ?? undefined;
  return {
    ...doc,
    id,
    _id: doc._id,
    order_number: doc.orderNumber ?? doc.order_number,
    orderNumber: doc.orderNumber ?? doc.order_number,
    table_no: doc.tableNumber ?? doc.table_no,
    tableNumber: doc.tableNumber ?? doc.table_no,
    created_at: createdAt,
    createdAt,
    status: doc.status,
    items,
    notes,
    note: notes,
    voice_note_url: voiceUrl,
    voiceNoteUrl: voiceUrl,
    total,
    total_amount: total,
    totalAmount: total,
  };
}

export function mapConvexOrders(list) {
  return (Array.isArray(list) ? list : []).map(mapConvexOrder).filter(Boolean);
}
