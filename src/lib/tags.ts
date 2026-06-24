import { init, query, run } from '$lib/db';
import type { Tag } from '$lib/types';

export const TAG_PRESET_COLORS = [
	'#ef4444', // red
	'#f97316', // orange
	'#eab308', // yellow
	'#22c55e', // green
	'#06b6d4', // cyan
	'#3b82f6', // blue
	'#8b5cf6', // violet
	'#ec4899'  // pink
];

export async function listTags(): Promise<Tag[]> {
	await init();
	return query<Tag>('SELECT id, nombre, color, created_at FROM tags ORDER BY nombre');
}

export async function createTag(data: { nombre: string; color: string }): Promise<Tag> {
	await init();
	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	await run('INSERT INTO tags (id, nombre, color, created_at) VALUES (?, ?, ?, ?)', [
		id,
		data.nombre.trim(),
		data.color,
		now
	]);
	return { id, nombre: data.nombre.trim(), color: data.color, created_at: now };
}

export async function deleteTag(id: string): Promise<void> {
	await init();
	await run('DELETE FROM tags WHERE id = ?', [id]);
}

export async function getTagsForPosicion(posicionId: string): Promise<Tag[]> {
	await init();
	return query<Tag>(
		`SELECT t.id, t.nombre, t.color, t.created_at
		 FROM tags t
		 JOIN posicion_tags pt ON t.id = pt.tag_id
		 WHERE pt.posicion_id = ?
		 ORDER BY t.nombre`,
		[posicionId]
	);
}

export async function getAllTagsPerPosicion(): Promise<Map<string, Tag[]>> {
	await init();
	const rows = await query<{ posicion_id: string; id: string; nombre: string; color: string; created_at: string }>(
		`SELECT pt.posicion_id, t.id, t.nombre, t.color, t.created_at
		 FROM tags t
		 JOIN posicion_tags pt ON t.id = pt.tag_id
		 ORDER BY t.nombre`
	);
	const map = new Map<string, Tag[]>();
	for (const row of rows) {
		const { posicion_id, ...tag } = row;
		const existing = map.get(posicion_id) ?? [];
		existing.push(tag);
		map.set(posicion_id, existing);
	}
	return map;
}

export async function setTagsForPosicion(posicionId: string, tagIds: string[]): Promise<void> {
	await init();
	await run('DELETE FROM posicion_tags WHERE posicion_id = ?', [posicionId]);
	for (const tagId of tagIds) {
		await run('INSERT INTO posicion_tags (posicion_id, tag_id) VALUES (?, ?)', [posicionId, tagId]);
	}
}

export async function addTagToPosicion(posicionId: string, tagId: string): Promise<void> {
	await init();
	await run(
		'INSERT OR IGNORE INTO posicion_tags (posicion_id, tag_id) VALUES (?, ?)',
		[posicionId, tagId]
	);
}

export async function removeTagFromPosicion(posicionId: string, tagId: string): Promise<void> {
	await init();
	await run('DELETE FROM posicion_tags WHERE posicion_id = ? AND tag_id = ?', [posicionId, tagId]);
}
