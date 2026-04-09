/** Natural sort comparator: "Room 2" < "Room 10" */
export function naturalSort(a: string, b: string): number {
  const ax: (string | number)[] = [];
  const bx: (string | number)[] = [];
  a.replace(/(\d+)|(\D+)/g, (_, $1, $2) => { ax.push($1 ? parseInt($1) : $2); return ""; });
  b.replace(/(\d+)|(\D+)/g, (_, $1, $2) => { bx.push($1 ? parseInt($1) : $2); return ""; });
  for (let i = 0; i < Math.max(ax.length, bx.length); i++) {
    const ai = ax[i] ?? "";
    const bi = bx[i] ?? "";
    if (typeof ai === "number" && typeof bi === "number") {
      if (ai !== bi) return ai - bi;
    } else {
      const cmp = String(ai).localeCompare(String(bi));
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}
