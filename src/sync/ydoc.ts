/*
 * Live co-writing: in shared projects each scene's text is also kept as a Yjs
 * document ("ystate"), which merges everyone's edits instead of replacing them.
 */
import * as Y from 'yjs';
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProsemirrorJSON } from '@tiptap/y-tiptap';
import type { Schema } from '@tiptap/pm/model';
import { b64, unb64 } from './crypto';
import { contentHash } from './yhash';
export { contentHash, SOLO_LIVE_MAX } from './yhash';

export const FIELD = 'default';
export const REMOTE = 'writell-remote';

/** The live-document fields kept on a scene */
export interface YFields { ystate?: string; yfor?: string; ylin?: string }
/** The saved live document still matches the saved text (it can fall behind when the text is edited without live mode) */
export const yFresh = (s: YFields & { content?: unknown }) => !!s.ystate && (s.yfor === undefined || s.yfor === contentHash(s.content));
/** Two saved live documents grew from the same starting text, so combining them can't double anything up */
export const sameLineage = (a: YFields, b: YFields) => (a.ylin ?? '') === (b.ylin ?? '');

/**
 * The scene's live document: from its saved state, or built from its text the same way on every device.
 * `ylin` names where its history started; `stale` = the saved text was changed after the live document was saved.
 */
export function sceneDoc(s: YFields & { content?: unknown }, schema: Schema): { doc: Y.Doc; ylin: string; stale: boolean } {
  const doc = new Y.Doc();
  if (s.ystate) { Y.applyUpdate(doc, unb64(s.ystate), REMOTE); return { doc, ylin: s.ylin ?? '', stale: !yFresh(s) }; }
  // a fixed "author" for the starting text, so two devices that start from the same text end up with one copy, not two
  const seed = new Y.Doc(); seed.clientID = 0;
  const json = s.content && typeof s.content === 'object' ? s.content : { type: 'doc', content: [{ type: 'paragraph' }] };
  prosemirrorJSONToYXmlFragment(schema, json as Record<string, unknown>, seed.getXmlFragment(FIELD));
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(seed), REMOTE);
  return { doc, ylin: 'h' + contentHash(json), stale: false };
}
export const encodeDoc = (doc: Y.Doc) => b64(Y.encodeStateAsUpdate(doc));
export const docContent = (doc: Y.Doc) => yXmlFragmentToProsemirrorJSON(doc.getXmlFragment(FIELD));

/** Combine two saved versions of a scene. `same` = the result is just `b` (nothing of `a` was missing from it). */
export function mergeStates(a: string, b: string): { ystate: string; content: unknown; yfor: string; same: boolean } {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, unb64(a)); Y.applyUpdate(doc, unb64(b));
  const onlyB = new Y.Doc(); Y.applyUpdate(onlyB, unb64(b));
  const merged = encodeDoc(doc);
  const content = docContent(doc);
  return { ystate: merged, content, yfor: contentHash(content), same: merged === encodeDoc(onlyB) };
}
