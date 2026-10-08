# OS-Deadlock
# Deadlock Obby

An interactive, animated visualization of operating-system **deadlock**, drawn as a Resource Allocation Graph in a Roblox-style "obby" theme.

- 🧍 **Players** are processes.
- 📦 **Items** (sword, Robux vault, server slot, ...) are resources.
- Lines between them show who **holds** what and who is **waiting** for what.

Plain HTML, CSS and JavaScript. No frameworks, no build step, no backend.

## Run it

Keep the three files in the same folder and open `index.html` in any modern browser (or use VS Code Live Server).

The page loads two fonts from Google Fonts. Without internet it still works and falls back to system fonts.

## Files

| File | What it contains |
| --- | --- |
| `index.html` | Page structure: header with tabs, the playground, and the Banker's page. |
| `style.css` | The whole theme: colors, chunky borders, hard shadows, animations. |
| `script.js` | All logic: playground, deadlock detection, Coffman pages, Banker's algorithm, tab routing. |

## The six tabs

| Tab | What it shows |
| --- | --- |
| 💀 **Deadlock** | The playground where you build your own graph and try to create a deadlock. |
| 🔒 **Mutual Exclusion** | Auto-playing animation of the first Coffman condition, with its fix. |
| ✋ **Hold & Wait** | Same, for the second condition. |
| 🚫 **No Preemption** | Same, for the third condition. |
| 🔄 **Circular Wait** | Same, for the fourth condition. |
| 🏦 **Avoidance** | Banker's Algorithm with editable tables and a step-by-step log. |

## Using the playground

| Action | How |
| --- | --- |
| Add a player or item | **+ 🧍 Player** and **+ 📦 Item** buttons. |
| Make a player **wait** for an item | Drag the player onto the item. An orange dashed line appears. |
| Make a player **hold** an item | Drag the item onto the player. If a copy is free, it flies over and a green line appears. |
| Give an item back | Drag a player onto an item it already holds. |
| Remove a line | Click it. A held item flies back and goes to a waiting player. |
| Remove a player or item | Click the red **✕** badge on it. |
| Change how many copies an item has | **+** and **−** badges on the item (1 to 6 copies). |
| Load an example | **💀 Deadlock** builds a deadlock step by step. **✅ Safe** builds a safe waiting chain. |
| Break a deadlock | **🛠️ Fix** removes one stuck player. Its items return and the others continue. |
| Start over | **🧹 Clear**. |

When a deadlock forms, the stage shakes and turns red, the cycle lines pulse, stuck players panic (😱), and a 💀 DEADLOCK badge appears. When it is resolved the badge turns into ✅ SAFE and the players hop.

## How deadlock is detected

The playground does not fake the result. After every change, `detect()` runs the standard **Work / Finish** detection algorithm on the real state, and it works with multiple copies of an item:

1. `Work` starts as the number of free copies of each item.
2. A player can **finish** if everything it is waiting for is available in `Work`.
3. A finished player gives back what it holds, which is added to `Work`.
4. Repeat until nobody new can finish.
5. Players who never finish are **deadlocked**.

Items that are in flight are reserved, so two waiting players can never receive the same copy. Items are never duplicated or lost.

## How Banker's Algorithm works (🏦 tab)

- Choose 2 to 6 players and 2 to 5 resource types, then edit the **Allocation**, **Max** and **Available** tables.
- `Need = Max − Allocation`.
- The log checks each player in turn: can its Need be met from `Work`?
  - If yes, the player finishes and releases its allocation back into `Work`.
  - If no, it must wait.
- If everyone can finish, you get a **safe sequence**. Otherwise the state is **unsafe** and the OS would refuse the allocation.
- It runs once when you open the tab. Press **▶ Run Banker's** to run again after editing.
- **Safe example** and **Unsafe example** reset the tables with working numbers.

## Customizing

All in `script.js`:

| What | Where |
| --- | --- |
| Player colors | `C` array at the top. |
| Item emoji | `RN` array at the top. |
| Playground examples | `scenario()` (the `'dead'` and `'safe'` scripts). |
| Coffman page text and animations | `CND` array. Each entry has the explanation texts and a `gen(n, m)` function that returns the animation steps. |
| Banker's starting numbers | `A0` (Allocation), `M0` (Max) and `V0` (Available) in the `BK` block. |
| Animation speed | Durations passed to `tok(...)` (milliseconds) and the `sl(...)` waits in the scripts. |
| Graph layout | `layout()` sets the rows (`y: 105` for players, `y: 365` for items). |
| Look and feel | `style.css` (CSS variables at the top of the file). |

## Known limitations

- On the **No Preemption** and **Circular Wait** pages, if you pick more players than the page can serve, the extra players keep their waiting arrows at the end of the animation. The default settings are not affected.
- Moving between tabs resets the Banker's tables to the default numbers.
- The animations pause while a tab is hidden and resume when you return.

## Testing

The logic was tested in a headless browser: deadlock detection, Fix, safe scenario, request and give behavior, item conservation, all four Coffman pages, and Banker's at several sizes. Mouse and touch dragging should be tried once in a real browser.
