// Lets a parent place a table's create button elsewhere (next to the sub-tabs) while the table
// keeps owning its create dialog. Without it the table shows its own button above the rows.
export interface CreateControl {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}
