/**
 * Sanitized reconstruction based on an implemented system.
 * Not verbatim production code. All data is fictional.
 */

interface Department {
  id: string;
  label: string;
  specialties: Array<{ label: string; path: string }>;
}

const departments: Department[] = [
  {
    id: "engineering",
    label: "Engineering",
    specialties: [
      { label: "Platform", path: "/specialties/platform" },
      { label: "Frontend", path: "/specialties/frontend" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    specialties: [{ label: "Service reliability", path: "/specialties/reliability" }],
  },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function mountDirectory(root: HTMLElement): () => void {
  root.innerHTML = departments
    .map(
      (department) =>
        `<button type="button" data-department="${escapeHtml(department.id)}">` +
        `${escapeHtml(department.label)}</button>`,
    )
    .join("");

  const onClick = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-department]");
    if (!button) return;
    const department = departments.find((item) => item.id === button.dataset.department);
    if (!department) return;
    root.dispatchEvent(
      new CustomEvent("directory:department-selected", {
        bubbles: true,
        detail: {
          id: department.id,
          specialties: department.specialties.map((item) => ({
            label: item.label,
            path: item.path,
          })),
        },
      }),
    );
  };

  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
