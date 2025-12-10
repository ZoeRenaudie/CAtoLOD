import React, { useState } from 'react';
import { Upload, Download, FileText, Info, Grid, HelpCircle, X, Link } from 'lucide-react';

export default function CAProfileParser() {
  const [xmlContent, setXmlContent] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [selectedTable, setSelectedTable] = useState('ca_objects');
  const [showAbout, setShowAbout] = useState(false);
  const [exportFormat, setExportFormat] = useState('XML');
  const [includeRelations, setIncludeRelations] = useState(true); // ✅ NOUVEAU

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setXmlContent(e.target.result);
        parseXML(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const parseXML = (xmlText) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        setError('Erreur lors du parsing du XML');
        return;
      }

      const metadataByTable = {};

      // Parser les elementSets (ancien format)
      const elementSets = xmlDoc.querySelectorAll('elementSet');
      elementSets.forEach((set) => {
        const tableName = set.getAttribute('code') || 'Sans nom';
        const elements = set.querySelectorAll('element');
        
        if (!metadataByTable[tableName]) {
          metadataByTable[tableName] = [];
        }

        elements.forEach((element) => {
          const code = element.getAttribute('code') || '';
          const datatype = element.getAttribute('datatype') || '';
          const labels = element.querySelectorAll('label');
          let label = '';
          
          labels.forEach(l => {
            const locale = l.getAttribute('locale');
            if (locale === 'fr_FR' || locale === 'fr') {
              label = l.textContent;
            } else if (!label && (locale === 'en_US' || locale === 'en')) {
              label = l.textContent;
            } else if (!label) {
              label = l.textContent;
            }
          });
          
          const descriptions = element.querySelectorAll('description');
          let description = '';
          descriptions.forEach(d => {
            const locale = d.getAttribute('locale');
            if (locale === 'fr_FR' || locale === 'fr') {
              description = d.textContent;
            } else if (!description && (locale === 'en_US' || locale === 'en')) {
              description = d.textContent;
            } else if (!description) {
              description = d.textContent;
            }
          });

          metadataByTable[tableName].push({
            code: code,
            datatype: datatype,
            label: label || code,
            description: description
          });
        });
      });

      // Parser les metadataElements (format avec <restriction><table>)
      const metadataElements = xmlDoc.querySelectorAll('metadataElement');
      metadataElements.forEach((element) => {
        const code = element.getAttribute('code');
        const datatype = element.getAttribute('datatype');
        const labels = element.querySelectorAll('labels > label');
        let label = '';
        let description = '';
        
        labels.forEach(l => {
          const locale = l.getAttribute('locale');
          const nameEl = l.querySelector('name');
          const descEl = l.querySelector('description');
          
          if (locale === 'fr_FR' || locale === 'fr') {
            if (nameEl) label = nameEl.textContent;
            if (descEl) description = descEl.textContent;
          } else if (!label && nameEl) {
            label = nameEl.textContent;
            if (descEl) description = descEl.textContent;
          }
        });
        
        const restrictions = element.querySelectorAll('typeRestrictions > restriction');
        restrictions.forEach(restriction => {
          const tableEl = restriction.querySelector('table');
          const table = tableEl ? tableEl.textContent : null;
          
          if (table) {
            if (!metadataByTable[table]) {
              metadataByTable[table] = [];
            }
            
            const exists = metadataByTable[table].some(f => f.code === code);
            if (!exists && code) {
              metadataByTable[table].push({
                code: code,
                datatype: datatype || '',
                label: label || code,
                description: description
              });
            }
          }
        });
      });

      // Parser les typeRestrictions
      const typeRestrictions = xmlDoc.querySelectorAll('typeRestriction');
      typeRestrictions.forEach(restriction => {
        const restrictedTable = restriction.getAttribute('type');
        const parentElement = restriction.parentElement;
        
        if (parentElement && restrictedTable) {
          const elementCode = parentElement.getAttribute('code');
          const elementDatatype = parentElement.getAttribute('datatype');
          
          if (elementCode && !metadataByTable[restrictedTable]) {
            metadataByTable[restrictedTable] = [];
          }
          
          if (elementCode && metadataByTable[restrictedTable]) {
            const exists = metadataByTable[restrictedTable].some(f => f.code === elementCode);
            if (!exists) {
              const labels = parentElement.querySelectorAll('label');
              let label = '';
              labels.forEach(l => {
                const locale = l.getAttribute('locale');
                if (locale === 'fr_FR' || locale === 'fr') {
                  label = l.textContent;
                } else if (!label) {
                  label = l.textContent;
                }
              });
              
              metadataByTable[restrictedTable].push({
                code: elementCode,
                datatype: elementDatatype || '',
                label: label || elementCode,
                description: ''
              });
            }
          }
        }
      });

      // ✅ NOUVEAU : Parser les relationshipTypes
      const relationshipTypes = [];
      const relTypes = xmlDoc.querySelectorAll('relationshipTable');
      
      relTypes.forEach(relTable => {
        const leftTable = relTable.getAttribute('name')?.split('_x_')[0] || '';
        const rightTable = relTable.getAttribute('name')?.split('_x_')[1] || '';
        
        const types = relTable.querySelectorAll('type');
        types.forEach(type => {
          const code = type.getAttribute('code') || '';
          const labels = type.querySelectorAll('label');
          let labelLeft = '';
          let labelRight = '';
          
          labels.forEach(l => {
            const locale = l.getAttribute('locale');
            const nameEl = l.querySelector('typename');
            const nameRevEl = l.querySelector('typename_reverse');
            
            if (locale === 'fr_FR' || locale === 'fr' || locale === 'en_US' || locale === 'en') {
              if (nameEl && !labelLeft) labelLeft = nameEl.textContent;
              if (nameRevEl && !labelRight) labelRight = nameRevEl.textContent;
            }
          });
          
          relationshipTypes.push({
            code: code,
            leftTable: 'ca_' + leftTable,
            rightTable: 'ca_' + rightTable,
            labelLeft: labelLeft || code,
            labelRight: labelRight || code
          });
        });
      });

      // Ajouter les champs intrinsèques
      const baseTables = ['ca_objects', 'ca_entities', 'ca_collections', 'ca_occurrences', 
                          'ca_places', 'ca_storage_locations', 'ca_loans', 'ca_movements', 'ca_list_items'];
      
      baseTables.forEach(table => {
        if (!metadataByTable[table]) {
          metadataByTable[table] = [];
        }
        
        const baseFields = [
          { code: 'idno', datatype: 'Text', label: 'Identifiant', description: 'Identifiant unique' },
          { code: 'preferred_labels', datatype: 'Text', label: 'Nom préféré', description: 'Label principal' },
          { code: 'type_id', datatype: 'List', label: 'Type', description: 'Type d\'enregistrement' },
          { code: 'access', datatype: 'Integer', label: 'Accès', description: 'Niveau d\'accès' },
          { code: 'status', datatype: 'Integer', label: 'Statut', description: 'Statut' }
        ];
        
        const existingCodes = metadataByTable[table].map(f => f.code);
        baseFields.forEach(field => {
          if (!existingCodes.includes(field.code)) {
            metadataByTable[table].unshift(field);
          }
        });
      });

      setParsedData({
        metadataByTable,
        relationshipTypes, // ✅ NOUVEAU
        tables: Object.keys(metadataByTable).sort(),
        summary: {
          totalTables: Object.keys(metadataByTable).length,
          totalFields: Object.values(metadataByTable).reduce((sum, fields) => sum + fields.length, 0),
          totalRelationships: relationshipTypes.length // ✅ NOUVEAU
        }
      });
      setError('');
    } catch (err) {
      setError('Erreur lors de l\'analyse du fichier : ' + err.message);
      console.error(err);
    }
  };

  // ✅ NOUVELLE FONCTION : Générer les mappings de relations
  const generateRelationshipMappings = (baseTable, startId) => {
    if (!parsedData?.relationshipTypes || !includeRelations) {
      return [];
    }

    const mappings = [];
    let currentId = startId;

    // Filtrer les relations pertinentes pour cette table
    const relevantRelations = parsedData.relationshipTypes.filter(
      rel => rel.leftTable === baseTable || rel.rightTable === baseTable
    );

    // Grouper par table liée
    const groupedByTable = {};
    relevantRelations.forEach(rel => {
      const linkedTable = rel.leftTable === baseTable ? rel.rightTable : rel.leftTable;
      if (!groupedByTable[linkedTable]) {
        groupedByTable[linkedTable] = [];
      }
      groupedByTable[linkedTable].push(rel);
    });

    // Générer les mappings pour chaque table liée
    Object.entries(groupedByTable).forEach(([linkedTable, relations]) => {
      const containerElement = `related_${linkedTable.replace('ca_', '')}`;
      
      // Conteneur parent pour cette table liée
      mappings.push([
        'Mapping',
        currentId.toString(),
        '1', // Parent = root
        containerElement,
        '',
        '',
        `Relations avec ${linkedTable}`,
        '',
        ''
      ]);
      const containerId = currentId;
      currentId++;

      // Élément répétable pour chaque relation
      mappings.push([
        'Mapping',
        currentId.toString(),
        containerId.toString(),
        linkedTable.replace('ca_', ''),
        `${baseTable}.${linkedTable}`,
        'returnAsArray=true',
        'Élément répétable pour chaque relation',
        '',
        ''
      ]);
      const itemId = currentId;
      currentId++;

      // Champs standards de la relation
      const relationFields = [
        { code: 'idno', source: `${baseTable}.${linkedTable}.idno`, label: 'Identifiant' },
        { code: 'name', source: `${baseTable}.${linkedTable}.preferred_labels.name`, label: 'Nom' },
        { code: 'relationship_type', source: `${baseTable}.${linkedTable}.relationship_typename`, label: 'Type de relation' }
      ];

      // Ajouter des champs spécifiques selon la table
      if (linkedTable === 'ca_entities') {
        relationFields.push({ 
          code: 'entity_type', 
          source: `${baseTable}.${linkedTable}.type_id`, 
          label: 'Type d\'entité' 
        });
      }

      relationFields.forEach(field => {
        mappings.push([
          'Mapping',
          currentId.toString(),
          itemId.toString(),
          field.code,
          field.source,
          '',
          field.label,
          '',
          ''
        ]);
        currentId++;
      });
    });

    return mappings;
  };

  const exportTableToCSV = (table, format = null) => { 
    if (!parsedData || !parsedData.metadataByTable[table]) {
      alert('Aucune donnée disponible pour cette table');
      return;
    }

    const actualFormat = format || exportFormat; 
    const fields = parsedData.metadataByTable[table];
    const rows = [];

    rows.push([
      'Rule type', 'ID', 'Parent ID', 'Element', 'Source', 
      'Options', 'Notes', 'Original values', 'Replacement values'
    ]);

    rows.push([
      'Mapping', '1', '', 'record', '', '', 'Root element for export', '', ''
    ]);

    fields.forEach((field, index) => {
      const elementName = actualFormat === 'XML' ? field.code : field.label;
      rows.push([
        'Mapping',
        (index + 2).toString(),
        '1',
        elementName,
        `${table}.${field.code}`,
        '',
        `${field.label}${field.description ? ' - ' + field.description : ''}`,
        '',
        ''
      ]);
    });

    // ✅ NOUVEAU : Ajouter les relations
    const relationMappings = generateRelationshipMappings(table, fields.length + 2);
    rows.push(...relationMappings);

    // Lignes vides
    for (let i = 0; i < 3; i++) {
      rows.push(['', '', '', '', '', '', '', '', '']);
    }

    // Settings
    rows.push(['', 'Setting', 'Setting Value', 'Description', 'Notes', '', '', '', '']);
    rows.push([
      'Setting', 'code', `export_${table.replace('ca_', '')}_${actualFormat.toLowerCase()}`, 
      'Alphanumeric code of the mapping', 'Arbitrary, no special characters or spaces', '', '', '', ''
    ]);
    rows.push([
      'Setting', 'name', `Export ${table} (${actualFormat})${includeRelations ? ' avec relations' : ''}`,
      'Human readable name of the mapping', 'Arbitrary text', '', '', '', ''
    ]);
    rows.push([
      'Setting', 'table', table, 'Sets the table for the exported data', 
      'Corresponds to CollectiveAccess Basic Tables', '', '', '', ''
    ]);
    rows.push([
      'Setting', 'exporter_format', actualFormat, 'Set exporter type', 
      'XML, CSV or MARC', '', '', '', ''
    ]);

    const csvContent = rows.map(row => 
      row.map(cell => {
        const escaped = String(cell).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    ).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Data_Export_Mapping_${table}${includeRelations ? '_with_relations' : ''}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    const totalRows = fields.length + (includeRelations ? relationMappings.length : 0);
    alert(`Mapping d'export généré pour ${table} avec ${totalRows} éléments${includeRelations ? ' (relations incluses)' : ''} !`);
  };

  const exportAllTables = () => {
    if (!parsedData || !parsedData.tables) {
      alert('Aucune donnée à exporter');
      return;
    }

    parsedData.tables.forEach((table, index) => {
      setTimeout(() => {
        exportTableToCSV(table, exportFormat); 
      }, index * 300);
    });

    setTimeout(() => {
      alert(`${parsedData.tables.length} fichiers mapping ${exportFormat} générés !`);
    }, parsedData.tables.length * 300 + 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">
                Extracteur de Structure CollectiveAccess
              </h1>
            </div>
            <button
              onClick={() => setShowAbout(true)}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              <HelpCircle className="w-6 h-6" />
              À propos
            </button>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Comment utiliser :</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Uploadez votre fichier XML du profil de configuration</li>
                  <li>Cochez "Inclure les relations" pour exporter aussi les liens entre tables</li>
                  <li>Exportez les mappings en CSV pour CollectiveAccess</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-indigo-500 mb-3" />
                <p className="mb-2 text-sm text-gray-700">
                  <span className="font-semibold">Cliquez pour uploader</span> votre fichier XML
                </p>
                <p className="text-xs text-gray-500">Profil d'installation CollectiveAccess (.xml)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".xml"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {parsedData && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="text-3xl font-bold mb-1">
                    {parsedData.summary.totalTables}
                  </div>
                  <div className="text-purple-100">Tables</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-6 text-white">
                  <div className="text-3xl font-bold mb-1">
                    {parsedData.summary.totalFields}
                  </div>
                  <div className="text-indigo-100">Champs totaux</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <div className="text-3xl font-bold mb-1">
                    {parsedData.summary.totalRelationships}
                  </div>
                  <div className="text-green-100">Types de relations</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Sélectionnez une table :
                    </label>
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {parsedData.tables.map(table => (
                        <option key={table} value={table}>
                          {table} ({parsedData.metadataByTable[table]?.length || 0} champs)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Format d'export des données :
                    </label>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="XML">XML (recommandé)</option>
                      <option value="CSV">CSV</option>
                      <option value="MARC">MARC</option>
                    </select>
                  </div>
                </div>

                {/* ✅ NOUVEAU : Case à cocher pour inclure les relations */}
                <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 rounded">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeRelations}
                      onChange={(e) => setIncludeRelations(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-2">
                      <Link className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-800">
                        Inclure les relations entre tables
                      </span>
                    </div>
                  </label>
                  <p className="text-xs text-gray-600 mt-2 ml-8">
                    Ajoute automatiquement les champs pour exporter les entités, collections, lieux, etc. liés à {selectedTable}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Export pour CollectiveAccess (Mapping) - Format : <span className="text-indigo-600">{exportFormat}</span> 
                  </h3>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => exportTableToCSV(selectedTable)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
                    >
                      <Download className="w-5 h-5" />
                      Mapping {exportFormat} - {selectedTable} {includeRelations && '(+ relations)'}
                    </button>
                    <button
                      onClick={exportAllTables}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
                    >
                      <Download className="w-5 h-5" />
                      Tous mappings {exportFormat}
                    </button>
                  </div>
                </div>
              </div>

              {parsedData.metadataByTable[selectedTable] && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Grid className="w-6 h-6 text-indigo-600" />
                    Aperçu de {selectedTable} - {parsedData.metadataByTable[selectedTable].length} champs
                    {includeRelations && (
                      <span className="text-sm font-normal text-green-600 flex items-center gap-1">
                        <Link className="w-4 h-4" />
                        + relations
                      </span>
                    )}
                  </h2>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code source</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {parsedData.metadataByTable[selectedTable].map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {item.label}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-indigo-600">
                              {selectedTable}.{item.code}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.datatype}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                              {item.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAbout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">À propos de cet outil</h2>
              <button
                onClick={() => setShowAbout(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Cet outil parse le profil de configuration XML de CollectiveAccess et génère automatiquement 
                des mappings d'export incluant tous les champs personnalisés ET les relations entre tables.
              </p>
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
                <p className="text-sm text-green-800 font-semibold mb-2">
                  <Link className="inline w-4 h-4 mr-2" />
                  Nouvelle fonctionnalité : Export des relations
                </p>
                <p className="text-sm text-green-800">
                  En cochant "Inclure les relations", l'outil ajoute automatiquement des sections pour 
                  exporter les entités, collections, lieux et autres tables liées à votre table principale.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}