// Grouped by space, a worktree's group goes under the group of the checkout it hangs from, as Spaces nests it.
// `worktrees`: "space.worktrees" (t3-spaces), worktree space -> { parent: its checkout's space, or null when the
// checkout isn't open, repo, name }. A checkout with no agents of its own still gets a header, `synthetic`, so the
// worktree doesn't read as a project of its own. Sets `kids` on a header and `parent` on a worktree's group.
export function nestWorktrees(groups, worktrees) {
  const slots = [], slotOf = new Map();
  for (const g of groups) {
    const w = g.space && worktrees[g.space];
    if (!w) {
      const slot = g.space && slotOf.get(g.space);
      // Its worktrees came first: the header they made gives way to the real one. A real group seen twice stays two.
      if (slot?.head.synthetic) slot.head = g;
      else {
        const made = { head: g, kids: [] };
        slots.push(made);
        if (g.space && !slot) slotOf.set(g.space, made);
      }
      continue;
    }
    const key = w.parent ?? `repo:${w.repo}`;
    let slot = slotOf.get(key);
    if (!slot) {
      slot = { head: { id: `rp-${key}`, label: w.name, space: w.parent ?? null, synthetic: true, members: [] }, kids: [] };
      slots.push(slot);
      slotOf.set(key, slot);
    }
    slot.kids.push(g);
  }
  return slots.flatMap(({ head, kids }) => {
    head.kids = kids;
    for (const k of kids) k.parent = head;
    return [head, ...kids];
  });
}
