# Changing how Task Master looks

You can restyle the whole app without touching any logic. Every colour, size, font and corner lives in **one file**: `src/renderer/styles/tokens.css`. The other stylesheets only read those variables.

To see a change, save the file and reload the window (`Ctrl+R` while running `npm start`).

## "I want to change X"

| I want to... | Edit this |
| --- | --- |
| Change the main colour (buttons, focus, selected) | `--accent` in `tokens.css`, and the `[data-accent]` blocks at the bottom |
| Add another accent colour choice | add a `[data-accent="name"]` block in `tokens.css` and one line to `ACCENTS` in `js/settings.js` |
| Change the deadline colours | `--u-over`, `--u-today`, `--u-soon`, `--u-week`, `--u-later` in `tokens.css` |
| Change the light or dark palette | the `:root` (dark) and `:root[data-theme="light"]` blocks in `tokens.css` |
| Change fonts | `--font-display` (titles) and `--font-ui` (everything else); font files are in `fonts/` |
| Change text sizes | the `--fs-*` scale in `tokens.css` |
| Make rows or cards taller or shorter | `--row-h` (List) and `--card-h` (Cards) |
| Change the sidebar width | `--side-w` |
| Make corners sharper or rounder | `--r-chip`, `--r-control`, `--r-card`, `--r-sheet` |
| Make everything tighter or looser | the `--sp-*` spacing scale and `--content-pad` |
| Change the List columns | `grid-template-columns` of `.trow` in `tasks.css` (and the eight cells in `rowHtml`, `js/tasks.js`) |
| Change how a card looks | `.tcard` in `tasks.css`; its HTML is `cardHtml` in `js/tasks.js` |
| Change Board columns or cards | `views.css` section 1; HTML is `renderBoard` in `js/views.js` |
| Change the Settings button in the sidebar | `.setbtn` in `layout.css` |
| Change the sidebar items | the `NAV` list at the top of the shell section in `js/tasks.js` |
| Change status colours | `--st-todo`, `--st-progress`, `--st-hold`, `--st-done` |
| Change label colours | `--lb-1` to `--lb-8` (a label's colour comes from its name) |

## The stylesheets

Load order matters (see `index.html`).

| File | What it styles |
| --- | --- |
| `tokens.css` | Design tokens and fonts. Start here |
| `base.css` | Reset, text, buttons, inputs, chips, the view switch, label chips, status ring, keyboard keys |
| `layout.css` | The app shell: sidebar, page header, toolbar, narrow-window rules |
| `tasks.css` | Quick add, runway, List rows, Cards, status chip, group headings, empty state |
| `views.css` | Board and Calendar |
| `popup.css` | Dialogs, the task popup, label input, subtasks, notes, the file window |
| `overlays.css` | Command palette, toasts, start-up card |
| `pages.css` | Files page and Settings page |

Each file starts with a table of contents and numbered sections, so you can search for "3. Quick add" and land on the right place.

## The one big idea: the deadline spectrum

The five colours of the logo (cyan, blue, violet, pink, ember) work as a heat scale. A task far away is cool cyan, a task due today is hot pink, an overdue one is ember. JavaScript gives every task element one class (`u-over`, `u-today`, `u-soon`, `u-week`, `u-later`, `u-none`, `u-done`). That class sets a single variable, `--u`, and the coloured edge, the date chip, the runway bars and the calendar items all read it. To recolour deadlines, change the `--u-*` tokens, not the classes.

## Rules the code follows

- No raw colours or pixel sizes in the component stylesheets. Use a token. If you need a new value, add a token.
- Components never set `--u` directly. Only the `u-*` classes do.
- The List view always draws eight cells per row so columns line up. If you remove a column, remove it from both `rowHtml` and `grid-template-columns`.
- Class names are plain and descriptive (`.trow`, `.tcard`, `.bcard`, `.runway`). Avoid generic names that another sheet could reuse. For example, `.empty` is the empty-state box, so the runway uses `.no-tasks`.

## Fonts

Bricolage Grotesque (titles) and Instrument Sans (text) are bundled so the app stays fully offline. Both are licensed under the SIL Open Font License 1.1, see `src/renderer/fonts/LICENSE.txt`.
