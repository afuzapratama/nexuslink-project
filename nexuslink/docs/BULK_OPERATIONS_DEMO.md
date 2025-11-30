# 📸 Visual Demo Guide - Bulk Operations

## How to Test in Browser

### 1. Open Dashboard
```
http://localhost:3000/links
```

### 2. What You'll See

#### Initial State (No Selection)
```
┌────────────────────────────────────────────────────────────────┐
│ Links                                                           │
│ Manage short aliases, their target URLs, and which node...     │
├────────────────────────────────────────────────────────────────┤
│ [Form to create new link]                                      │
├────────────────────────────────────────────────────────────────┤
│ Table:                                                          │
│ [ ] | Alias        | Target URL           | Node | Hits | ... │
│ [ ] | bulk-test-1  | example.com/page-1   | Any  | 0    | ... │
│ [ ] | bulk-test-2  | example.com/page-2   | Any  | 0    | ... │
│ [ ] | bulk-test-3  | example.com/page-3   | Any  | 0    | ... │
└────────────────────────────────────────────────────────────────┘
```

#### After Selecting 3 Links
```
┌────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 🔵 3 link(s) selected                                     │  │
│ │ [Enable] [Disable] [Delete]           Clear selection    │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│ Table:                                                          │
│ [✓] | Alias        | Target URL           | Node | Hits | ... │
│ [✓] | bulk-test-1  | example.com/page-1   | Any  | 0    | ... │← Sky blue
│ [✓] | bulk-test-2  | example.com/page-2   | Any  | 0    | ... │← Sky blue
│ [✓] | bulk-test-3  | example.com/page-3   | Any  | 0    | ... │← Sky blue
│ [ ] | bulk-test-4  | example.com/page-4   | Any  | 0    | ... │
└────────────────────────────────────────────────────────────────┘
```

#### Confirmation Modal (Delete Action)
```
┌────────────────────────────────────────────────────────────────┐
│           [Modal appears centered with backdrop blur]          │
│                                                                 │
│   ┌─────────────────────────────────────────────┐             │
│   │  Confirm Bulk Action                   [×]  │             │
│   ├─────────────────────────────────────────────┤             │
│   │                                             │             │
│   │  You are about to permanently delete        │             │
│   │  3 link(s). This action cannot be undone.  │             │
│   │                                             │             │
│   │  [Cancel]        [Confirm Delete]           │             │
│   └─────────────────────────────────────────────┘             │
└────────────────────────────────────────────────────────────────┘
       ^                    ^
       Gray                 Red button
```

#### Success Toast
```
┌────────────────────────────────────────────────────────────────┐
│                        ┌─────────────────────────┐             │
│                        │ ✅ Deleted 3 link(s),   │             │
│                        │    0 failed             │             │
│                        └─────────────────────────┘             │
│                              (Toast notification)              │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎮 Interactive Test Scenarios

### Scenario 1: Bulk Disable
1. Select 3 active links (checkboxes)
2. Action bar appears → Click "Disable"
3. Confirmation modal → Click "Confirm Disable"
4. Toast shows "Updated 3 link(s), 0 failed"
5. Table refreshes → Links show "No" in Active column

### Scenario 2: Bulk Enable
1. Select 2 disabled links
2. Action bar → Click "Enable"
3. Confirm → "Confirm Enable"
4. Toast shows success
5. Links now show "Yes" in Active column (green badge)

### Scenario 3: Bulk Delete
1. Select 2 links
2. Action bar → Click "Delete" (red button)
3. Modal warns: "permanently delete... cannot be undone"
4. Confirm → Processing spinner appears
5. Toast shows "Deleted 2 link(s), 0 failed"
6. Links removed from table

### Scenario 4: Select All
1. Click checkbox in table header
2. ALL links get selected instantly
3. Action bar shows total count
4. Click "Clear selection" to deselect all

### Scenario 5: Mixed Results
1. Select 5 links (some exist, some don't in backend)
2. Click "Enable"
3. Confirm action
4. Toast shows: "Updated 3 link(s), 2 failed"
   - Success count in green
   - Failure count in red

---

## 🎨 Color Coding Guide

### Action Buttons
- **Enable**: `bg-emerald-500` (Green) → Positive action
- **Disable**: `bg-slate-600` (Gray) → Neutral action
- **Delete**: `bg-rose-500` (Red) → Destructive action

### Selection Feedback
- **Unselected row**: Default background
- **Selected row**: `bg-sky-500/5` (Sky blue tint)
- **Action bar**: `bg-sky-500/10` (Sky blue background)

### Modal Buttons
- **Cancel**: `border-slate-600 bg-slate-800` (Neutral)
- **Confirm**: Matches action color (red/green/gray)

### Status Badges
- **Active (Yes)**: `bg-emerald-500/10 text-emerald-300` (Green)
- **Inactive (No)**: `bg-slate-800 text-slate-400` (Gray)

---

## 🔥 Pro Tips

1. **Keyboard Navigation:**
   - Tab through checkboxes
   - Space to toggle selection
   - Esc to close modal

2. **Quick Actions:**
   - Header checkbox for select all
   - "Clear selection" for quick reset

3. **Visual Feedback:**
   - Selected rows have subtle blue tint
   - Action bar slides in smoothly
   - Modal has backdrop blur

4. **Safety Features:**
   - Delete requires confirmation
   - Shows exact count before action
   - Can't accidentally bulk delete

5. **Error Resilience:**
   - Individual failures don't stop batch
   - Clear success/failure counts
   - Failed items remain in table

---

## 📱 Responsive Design

- Mobile: Buttons stack vertically
- Tablet: Action bar stays sticky
- Desktop: Full width table with horizontal scroll

---

**Ready to test?** Open http://localhost:3000/links and try it out! 🚀
