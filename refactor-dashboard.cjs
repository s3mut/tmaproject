const fs = require('fs');

const file = 'd:\\Project\\e1-TMA\\src\\views\\DashboardView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Select to imports
content = content.replace(
  "import { SectionHeader, EmptyState } from '../components/ui';",
  "import { SectionHeader, EmptyState, Select } from '../components/ui';"
);

// 2. Add groupCategories import
content = content.replace(
  "import ItemsView from './ItemsView';",
  "import ItemsView from './ItemsView';\nimport { groupCategories } from '../utils/categoryGroups';"
);

// 3. Remove PRESET_GROUPS and CategoryGroup interface
content = content.replace(/interface CategoryGroup \{[\s\S]*?\];\n/, '');

// 4. Update states inside DashboardView
content = content.replace(
  /const \[selectedGroupKey, setSelectedGroupKey\] = useState<string>\('all'\);\n  const \[selectedSubCatName, setSelectedSubCatName\] = useState<string>\('all'\);/,
  "const [selectedCategoryName, setSelectedCategoryName] = useState<string>(initialCategory || 'all');\n\n  // Sinkronisasi dengan initialCategory jika berubah dari luar\n  React.useEffect(() => {\n    if (initialCategory) setSelectedCategoryName(initialCategory);\n  }, [initialCategory]);"
);

// 4b. Add React import if not exists
if (!content.includes("import React,")) {
    content = content.replace("import { useState, useMemo }", "import React, { useState, useMemo }");
}

// 5. Replace categoryGroups useMemo
content = content.replace(
  /const categoryGroups = useMemo\(\(\) => \{[\s\S]*?\}, \[categories\]\);/m,
  "const groupedCategories = useMemo(() => groupCategories(categories), [categories]);"
);

// 6. Remove activeGroup and activeCategoryNames
content = content.replace(/const activeGroup = useMemo\(\(\) => \{[\s\S]*?\}, \[selectedGroupKey, activeGroup, selectedSubCatName\]\);/m, '');

// 7. Update filteredAssets
content = content.replace(
  /const filteredAssets = useMemo\(\(\) => \{\n    if \(!activeCategoryNames\) return assets;\n    return assets.filter\(a => activeCategoryNames.includes\(a.category_name\)\);\n  \}, \[assets, activeCategoryNames\]\);/,
  "const filteredAssets = useMemo(() => {\n    if (selectedCategoryName === 'all') return assets;\n    return assets.filter(a => a.category_name === selectedCategoryName);\n  }, [assets, selectedCategoryName]);"
);

// 8. Update recentMutations
content = content.replace(
  /const recentMutations = useMemo\(\(\) => \{[\s\S]*?\}, \[mutations, activeCategoryNames\]\);/m,
  `const recentMutations = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return (mutations || []).filter((m) => {
      const mutDate = new Date(m.mutation_date);
      const isWithin7Days = mutDate >= sevenDaysAgo;
      if (!isWithin7Days) return false;
      if (selectedCategoryName !== 'all' && m.asset_category_name !== selectedCategoryName) return false;
      return true;
    }).slice(0, 5);
  }, [mutations, selectedCategoryName]);`
);

// 9. Update handleStatClick
content = content.replace(
  /const handleStatClick = \(status: string\) => \{[\s\S]*?  \};/m,
  `const handleStatClick = (status: string) => {
    if (onStatusClick) {
      onStatusClick(status, selectedCategoryName);
    }
  };`
);

// 10. Update Total card label
content = content.replace(
  /\{selectedGroupKey === 'all'[\s\S]*?\?\s*`Total — \$\{activeGroup\?.label \?\? selectedGroupKey\}`\}/m,
  `{selectedCategoryName === 'all' ? 'Total Aset' : \`Total — \${selectedCategoryName}\`}`
);

// 11. Update Total card Reset button condition
content = content.replace(/\{selectedGroupKey !== 'all' && \(/g, "{selectedCategoryName !== 'all' && (");
content = content.replace(/setSelectedGroupKey\('all'\);\n\s*setSelectedSubCatName\('all'\);/g, "setSelectedCategoryName('all');");

// 12. Replace Categories Group Section UI (Lines ~304 to ~397)
const uiRegex = /\{\/\* Categories Group Section \*\/\}[\s\S]*?\{\/\* Aset Terakhir Dipindah/m;
const newUI = `{/* Categories Group Section */}
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider pl-1">
          <i className="fas fa-layer-group mr-1.5"></i> Filter Kategori Aset
        </label>
        <Select
          value={selectedCategoryName}
          onChange={(e) => setSelectedCategoryName(e.target.value)}
          className="w-full text-sm py-3 bg-slate-800/80 border-slate-700/60 font-semibold shadow-sm"
        >
          <option value="all">📦 Semua Kategori</option>
          {groupedCategories.map((grp) => (
            <optgroup key={grp.label} label={grp.label}>
              {grp.items.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      {/* Aset Terakhir Dipindah`;

content = content.replace(uiRegex, newUI);

// 13. Fix Terakhir Dipindah title
content = content.replace(
  /title=\{selectedGroupKey === 'all' \? 'Terakhir Dipindah \(7 Hari\)'[\s\S]*?: `Mutasi — \$\{activeGroup\?.label\} \(7 Hari\)`\}/m,
  `title={selectedCategoryName === 'all' ? 'Terakhir Dipindah (7 Hari)' : \`Mutasi — \${selectedCategoryName} (7 Hari)\`}`
);

fs.writeFileSync(file, content);
console.log('DashboardView refactored');
