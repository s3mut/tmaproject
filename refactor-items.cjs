const fs = require('fs');

const file = 'd:\\Project\\e1-TMA\\src\\views\\ItemsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import groupCategories
content = content.replace(
  "import { Select } from '../components/ui';",
  "import { Select } from '../components/ui';\nimport { groupCategories } from '../utils/categoryGroups';"
);

// 2. Add groupedCategories to useMemo or directly inside ItemsView
content = content.replace(
  "const siteRegionMap = useMemo(() => new Map(sites.map(s => [s.site_alias, s.region || 'Tanpa Region'])), [sites]);",
  "const siteRegionMap = useMemo(() => new Map(sites.map(s => [s.site_alias, s.region || 'Tanpa Region'])), [sites]);\n\n  const groupedCategories = useMemo(() => groupCategories(categories), [categories]);"
);

// 3. Update the Dropdown rendering for Kategori
const oldSelect = `{categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}`;
const newSelect = `{groupedCategories.map((grp) => (
                <optgroup key={grp.label} label={grp.label}>
                  {grp.items.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
              ))}`;

content = content.replace(oldSelect, newSelect);

fs.writeFileSync(file, content);
console.log('ItemsView refactored');
