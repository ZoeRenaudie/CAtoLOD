import React, { useState } from 'react';
import { Upload, Download, FileText, Info, Grid, HelpCircle, X } from 'lucide-react';

export default function CAProfileParser() {
  const [xmlContent, setXmlContent] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [selectedTable, setSelectedTable] = useState('ca_objects');
    const [showAbout, setShowAbout] = useState(false);

// Gestion de l'upload du fichier
  const handleFileUpload = (event) => {
      // Récupère le premier fichier sélectionné par l'utilisateur
      // event.target.files est un tableau-like de tous les fichiers uploadés
      // [0] = on prend seulement le premier fichier
    const file = event.target.files[0];

    if (file) { // Vérifie qu'un fichier a bien été sélectionné
      const reader = new FileReader(); // FileReader = API du navigateur pour lire le contenu des fichiers. Permet de lire des fichiers locaux sans envoyer au serveur
      
      // Définir ce qui se passe QUAND le fichier est complètement lu
      // C'est asynchrone : le fichier se lit en arrière-plan
      reader.onload = (e) => {
      // e.target.result contient le CONTENU TEXTE du fichier XML
      // Ex: "<?xml version="1.0"?><profile>...</profile>"
      
      // Sauvegarder le contenu brut dans le state (optionnel, pour debug)
        setXmlContent(e.target.result);

      // Appeler la fonction de parsing avec le texte XML
        parseXML(e.target.result);
      };

      // DÉMARRER la lecture du fichier en mode TEXTE
      // readAsText() lit le fichier comme une chaîne de caractères
      reader.readAsText(file);
    }
  };

  // Parser le XML en javascritp
  const parseXML = (xmlText) => {
    try { // try-catch pour gérer les erreurs de parsing
    
      // DOMParser = API du navigateur pour convertir du texte XML en objet DOM
      // DOM = Document Object Model = structure en arbre qu'on peut interrog
      const parser = new DOMParser();
      // parseFromString() convertit le texte XML en document DOM
      // Résultat: xmlDoc = objet DOM navigable avec querySelector, getAttribute, etc.
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml'); // 'text/xml' indique le type de contenu à parser
      
      // VÉRIFICATION D'ERREUR DE PARSING
      // Si le XML est mal formé (balise non fermée, syntaxe invalide),
      // DOMParser crée un élément <parsererror> au lieu de retourner une erreur
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        setError('Erreur lors du parsing du XML');
        return; // Arrêter le parsing si erreur
      }


      const metadataByTable = {}; // Objet pour stocker les métadonnées par table

      // Parser les elementSets (métadonnées personnalisées) - ancien format
      // Cherche les balises <elementSet code="nom_table">
      const elementSets = xmlDoc.querySelectorAll('elementSet');
      console.log('=== DEBUG: ElementSets trouvés:', elementSets.length);
      
      elementSets.forEach((set, setIndex) => {
        const tableName = set.getAttribute('code') || 'Sans nom';  // exemple dans notre cas "ca_objects"
        const elements = set.querySelectorAll('element'); // Cherche les balises <element> à l'intérieur de cet elementSet
        
        console.log(`=== Table ${setIndex}: ${tableName}, Elements: ${elements.length}`);
        
        if (!metadataByTable[tableName]) {
          metadataByTable[tableName] = [];
        }

        // Pour chaque élément dans elementSet, récupère les informations nécessaire pour notre export de mapping
        elements.forEach((element, elemIndex) => {
          const code = element.getAttribute('code') || '';
          const datatype = element.getAttribute('datatype') || '';
          const labels = element.querySelectorAll('label');
          let label = '';
          
          console.log(`  Element ${elemIndex}: code=${code}, datatype=${datatype}`);
          
          // Chercher le label en français ou anglais avec pref pour le français
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
          
          // Extraire la description (même logique que label)
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

          // Stocker le champ dans la table correspondante
          metadataByTable[tableName].push({
            code: code,
            datatype: datatype,
            label: label || code,
            description: description
          });
        });
      });

      // Parser les metadataElements (format avec <restriction><table>)
      // Structure: <elementSets><metadataElement><typeRestrictions><restriction><table>
      const metadataElements = xmlDoc.querySelectorAll('metadataElement');
      console.log('=== DEBUG: MetadataElements trouvés:', metadataElements.length);
      
      metadataElements.forEach((element, index) => {
        const code = element.getAttribute('code');
        const datatype = element.getAttribute('datatype');
        // Structure spécifique: <labels><label locale="fr_FR"><name>Label</name></label></labels>
        const labels = element.querySelectorAll('labels > label');
        let label = '';
        let description = '';
        
        console.log(`  MetadataElement ${index}: code=${code}, datatype=${datatype}`);
        
        // Extraire le label (préférence pour français)
        labels.forEach(l => {
          const locale = l.getAttribute('locale');
          const nameEl = l.querySelector('name'); // Le label est dans <name>
          const descEl = l.querySelector('description'); // La description dans <description>
          
          if (locale === 'fr_FR' || locale === 'fr') {
            if (nameEl) label = nameEl.textContent;
            if (descEl) description = descEl.textContent;
          } else if (!label && nameEl) {
            label = nameEl.textContent;
            if (descEl) description = descEl.textContent;
          }
        });
        
        // Trouver à quelles tables cet élément s'applique via <restriction><table>
        const restrictions = element.querySelectorAll('typeRestrictions > restriction');
        console.log(`    Restrictions trouvées: ${restrictions.length}`);
        
        restrictions.forEach(restriction => {
          const tableEl = restriction.querySelector('table');
          const table = tableEl ? tableEl.textContent : null;
          
          console.log(`      Table: ${table}`);
          
          if (table) {
            if (!metadataByTable[table]) {
              metadataByTable[table] = [];
            }
            
            // Vérifier que le champ n'existe pas déjà (éviter doublons)
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

      // Parser les restrictions (qui montrent les tables liées)
      const restrictions = xmlDoc.querySelectorAll('typeRestriction');
      restrictions.forEach(restriction => {
        const table = restriction.getAttribute('type');
        if (table && !metadataByTable[table]) {
          metadataByTable[table] = [];
        }
      });

      // Parser aussi les restrictions pour trouver quels éléments sont liés à quelles tables
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
            // Vérifier si déjà présent
            const exists = metadataByTable[restrictedTable].some(f => f.code === elementCode);
            if (!exists) {
              // Récupérer le label depuis le parent
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

      // Ajouter les champs intrinsèques de base pour les tables principales
      // CollectiveAccess a des champs de base qui existent dans toutes les tables
    // mais qui ne sont PAS définis dans le XML car ils sont natifs : idno (identifiant), preferred_labels (nom), type_id, access, status
      const baseTables = ['ca_objects', 'ca_entities', 'ca_collections', 'ca_occurrences', 
                          'ca_places', 'ca_storage_locations', 'ca_loans', 'ca_movements', 'ca_list_items'];
      
      baseTables.forEach(table => {
        if (!metadataByTable[table]) {
          metadataByTable[table] = [];
        }
        
        // Ajouter les champs intrinsèques en premier
        const baseFields = [
          { code: 'idno', datatype: 'Text', label: 'Identifiant', description: 'Identifiant unique' },
          { code: 'preferred_labels', datatype: 'Text', label: 'Nom préféré', description: 'Label principal' },
          { code: 'type_id', datatype: 'List', label: 'Type', description: 'Type d\'enregistrement' },
          { code: 'access', datatype: 'Integer', label: 'Accès', description: 'Niveau d\'accès' },
          { code: 'status', datatype: 'Integer', label: 'Statut', description: 'Statut' }
        ];
        
        // Éviter les doublons
        const existingCodes = metadataByTable[table].map(f => f.code);
        baseFields.forEach(field => {
          if (!existingCodes.includes(field.code)) {
            metadataByTable[table].unshift(field);
          }
        });
      });

      // Parser les types 
      const types = xmlDoc.querySelectorAll('type');
      const typesList = [];
      types.forEach(type => {
        typesList.push({
          table: type.parentElement?.nodeName || '',
          code: type.getAttribute('code') || '',
          name: type.querySelector('label')?.textContent || '',
          parent: type.getAttribute('parent') || ''
        });
      });

      // Parser les listes de vocabulaire
      const lists = xmlDoc.querySelectorAll('list');
      const listData = [];
      lists.forEach(list => {
        const code = list.getAttribute('code') || '';
        const items = list.querySelectorAll('item');
        items.forEach(item => {
          listData.push({
            list: code,
            code: item.getAttribute('idno') || item.getAttribute('code') || '',
            label: item.querySelector('label')?.textContent || ''
          });
        });
      });

      console.log('Données parsées:', metadataByTable);

      // Sauvegarder les données parsées
      setParsedData({
        metadataByTable,
        types: typesList,
        lists: listData,
        tables: Object.keys(metadataByTable).sort(),
        summary: {
          totalTables: Object.keys(metadataByTable).length,
          totalFields: Object.values(metadataByTable).reduce((sum, fields) => sum + fields.length, 0),
          totalTypes: typesList.length,
          totalLists: lists.length
        }
      });
      setError('');
    } catch (err) {
      setError('Erreur lors de l\'analyse du fichier : ' + err.message);
      console.error(err);
    }
  };

  // Exporter une table en CSV pour mapping CollectiveAccess selon le template
  const exportTableToCSV = (table) => {
    if (!parsedData || !parsedData.metadataByTable[table]) {
      alert('Aucune donnée disponible pour cette table');
      return;
    }

    const fields = parsedData.metadataByTable[table];
    const rows = [];

    // En-tête exact du template CollectiveAccess
    rows.push([
      'Rule type',
      'ID', 
      'Parent ID',
      'Element',
      'Source',
      'Options',
      'Notes',
      'Original values',
      'Replacement values'
    ]);

    // Ajouter chaque champ comme une ligne de mapping
    fields.forEach((field, index) => {
      rows.push([
        'Mapping',
        (index + 1).toString(),
        '',
        field.label || field.code,
        `${table}.${field.code}`,
        '',
        field.description || '',
        '',
        ''
      ]);
    });

    // Lignes vides de séparation
    for (let i = 0; i < 3; i++) {
      rows.push(['', '', '', '', '', '', '', '', '']);
    }

    // Section Settings
    rows.push(['', 'Setting', 'Setting Value', 'Description', 'Notes', '', '', '', '']);
    
    rows.push([
      'Setting',
      'code',
      `export_${table.replace('ca_', '')}`,
      'Alphanumeric code of the mapping',
      'Arbitrary, no special characters or spaces',
      '', '', '', ''
    ]);

    rows.push([
      'Setting',
      'name',
      `Export ${table}`,
      'Human readable name of the mapping',
      'Arbitrary text',
      '', '', '', ''
    ]);

    rows.push([
      'Setting',
      'table',
      table,
      'Sets the table for the exported data',
      'Corresponds to CollectiveAccess Basic Tables',
      '', '', '', ''
    ]);

    rows.push([
      'Setting',
      'exporter_format',
      'CSV',
      'Set exporter type',
      'XML, CSV or MARC',
      '', '', '', ''
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
    link.setAttribute('download', `Data_Export_Mapping_${table}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`Mapping d'export généré pour ${table} avec ${fields.length} champs !`);
  };

  const exportAllTables = () => {
    if (!parsedData || !parsedData.tables) {
      alert('Aucune donnée à exporter');
      return;
    }

    parsedData.tables.forEach((table, index) => {
      setTimeout(() => {
        exportTableToCSV(table);
      }, index * 300);
    });

    setTimeout(() => {
      alert(`${parsedData.tables.length} fichiers CSV générés !`);
    }, parsedData.tables.length * 300 + 500);
  };

  const exportSchemaToXML = (table) => {
    if (!parsedData || !parsedData.metadataByTable[table]) {
      alert('Aucune donnée disponible pour cette table');
      return;
    }

    const fields = parsedData.metadataByTable[table];
    
    // Créer le XML pour le schéma
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += `<schema table="${table}">\n`;
    xmlContent += `  <fields>\n`;
    
    fields.forEach(field => {
      xmlContent += `    <field>\n`;
      xmlContent += `      <code>${field.code}</code>\n`;
      xmlContent += `      <label>${field.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</label>\n`;
      xmlContent += `      <datatype>${field.datatype}</datatype>\n`;
      if (field.description) {
        xmlContent += `      <description>${field.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</description>\n`;
      }
      xmlContent += `      <source>${table}.${field.code}</source>\n`;
      xmlContent += `    </field>\n`;
    });
    
    xmlContent += `  </fields>\n`;
    xmlContent += `</schema>`;

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `schema_${table}.xml`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`Schéma XML généré pour ${table} avec ${fields.length} champs !`);
  };

  const exportAllSchemasToXML = () => {
    if (!parsedData || !parsedData.tables) {
      alert('Aucune donnée à exporter');
      return;
    }

    parsedData.tables.forEach((table, index) => {
      setTimeout(() => {
        exportSchemaToXML(table);
      }, index * 300);
    });

    setTimeout(() => {
      alert(`${parsedData.tables.length} fichiers XML de schéma générés !`);
    }, parsedData.tables.length * 300 + 500);
  };

  // Interface utilisateur
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
                  <li>Uploadez votre fichier XML du profil d'installation</li>
                  <li>Les noms des rubriques deviennent les noms des colonnes CSV</li>
                  <li>Exportez les tables en CSV avec tous les champs réels</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Zone d'upload */}
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

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Résumé */}
          {parsedData && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
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
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="text-3xl font-bold mb-1">
                    {parsedData.summary.totalTypes}
                  </div>
                  <div className="text-blue-100">Types</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <div className="text-3xl font-bold mb-1">
                    {parsedData.summary.totalLists}
                  </div>
                  <div className="text-green-100">Listes</div>
                </div>
              </div>

              {/* Sélecteur de table */}
              <div className="bg-gray-50 rounded-lg p-6">
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

              {/* Boutons d'export */}
              <div className="flex flex-col gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Export pour CollectiveAccess (Mapping)</h3>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => exportTableToCSV(selectedTable)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
                    >
                      <Download className="w-5 h-5" />
                      Mapping CSV {selectedTable}
                    </button>
                    <button
                      onClick={exportAllTables}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
                    >
                      <Download className="w-5 h-5" />
                      Tous les mappings CSV
                    </button>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Export pour Ontologie (Schéma XML)</h3>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => exportSchemaToXML(selectedTable)}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
                    >
                      <Download className="w-5 h-5" />
                      Schéma XML {selectedTable}
                    </button>
                    <button
                      onClick={exportAllSchemasToXML}
                      className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
                    >
                      <Download className="w-5 h-5" />
                      Tous les schémas XML
                    </button>
                  </div>
                </div>
              </div>

              {/* Aperçu des champs */}
              {parsedData.metadataByTable[selectedTable] && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Grid className="w-6 h-6 text-indigo-600" />
                    Aperçu de {selectedTable} - {parsedData.metadataByTable[selectedTable].length} champs
                  </h2>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom colonne (Label)</th>
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

      {/* Modal À propos */}
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
            <div className="p-6 prose prose-sm max-w-none">
              <h3 className="text-xl font-bold text-indigo-600 mt-0">Objectif Global</h3>
              <p>
                Créer un outil permettant d'extraire automatiquement la structure d'une base de données CollectiveAccess 
                depuis son profil de configuration XML, et de la transformer en formats exploitables pour deux cas d'usage distincts :
              </p>
              <ol>
                <li>- <strong>Export de données</strong> via CollectiveAccess (format CSV mapping)</li>
                <li>- <strong>Mapping d'ontologie</strong> pour alignement sémantique (format XML schéma)</li>
                <br />
              </ol>

              <h3 className="text-xl font-bold text-indigo-600"> Problématique</h3>
              <p>
                CollectiveAccess utilise des tables (ca_objects, ca_entities, ca_places, etc.) et des champs personnalisés 
                définis par chaque institution. Pour exporter des données plus facilement, il faut créer un fichier de mapping qui indique 
                quels champs exporter, avec leurs codes techniques précis.
              </p>
              <p>
                Documenter manuellement des centaines de champs est fastidieux et source d'erreurs. Cet outil automatise 
                cette tâche en parsant le profil XML d'installation.
              </p> <br />

              <h3 className="text-xl font-bold text-indigo-600"> Architecture</h3>
              <h4 className="text-lg font-semibold text-gray-800">Étape 1 : Acquisition</h4>
              <p>L'utilisateur upload le fichier XML du profil d'installation exporté depuis Providence.</p><br />

              <h4 className="text-lg font-semibold text-gray-800">Étape 2 : Parsing Multi-Format</h4>
              <p>
                CollectiveAccess a évolué et utilise plusieurs formats XML. L'outil parse 3 structures différentes :
              </p>
              <ul>
                <li><code>&lt;elementSet&gt;</code> (ancien format)</li>
                <li><code>&lt;metadataElement&gt;</code> avec <code>&lt;restriction&gt;&lt;table&gt;</code> (format actuel)</li>
                <li><code>&lt;typeRestriction type=""&gt;</code> (format alternatif)</li><br />
              </ul>

              <h4 className="text-lg font-semibold text-gray-800">Étape 3 : Enrichissement</h4>
              <p>
                Le XML ne contient que les champs personnalisés. L'outil ajoute automatiquement les 5 champs natifs 
                de CollectiveAccess : <code>idno</code>, <code>preferred_labels</code>, <code>type_id</code>, 
                <code>access</code>, <code>status</code>.
              </p><br />

              <h3 className="text-xl font-bold text-indigo-600"> Deux Formats d'Export</h3>
              
              <h4 className="text-lg font-semibold text-gray-800">1. CSV Mapping pour CollectiveAccess</h4>
              <p>
                Génère un fichier CSV importable dans Providence (Manage → Import/Export → Import Data Mappings) 
                pour configurer un export de données. Le format respecte les 9 colonnes requises avec :
              </p>
              <ul>
                <li>Un élément racine <code>&lt;record&gt;</code> pour la structure XML</li>
                <li>Hiérarchie parent-enfant (tous les champs enfants du root)</li>
                <li>Codes techniques dans la colonne Element</li>
                <li>Labels lisibles dans la colonne Notes</li>
              </ul><br />

              <h4 className="text-lg font-semibold text-gray-800">2. Schéma XML pour Ontologie</h4>
              <p>
                Génère un fichier XML structuré avec tous les métadonnées de chaque champ (code, label, datatype, 
                description). Utilisable pour :
              </p>
              <ul>
                <li>Mapping avec ontologies externes (CIDOC-CRM, Dublin Core)</li>
                <li>Documentation technique</li>
                <li>Analyse de correspondance avec vocabulaires contrôlés</li><br />
              </ul>

              <h3 className="text-xl font-bold text-indigo-600"> Utilisation</h3>
              <ol>
                <li>Dans Providence : Manage → Administration → Maintenance → Download installation profile</li>
                <li>Uploadez le fichier XML dans cet outil</li>
                <li>Sélectionnez une table</li>
                <li>Exportez le mapping CSV ou le schéma XML selon vos besoins</li>
                <li>Importez le mapping CSV dans Providence pour configurer votre export</li>
              </ol>

              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                <p className="text-sm text-blue-800 mb-0">
                  <strong>Note :</strong> Cet outil est open-source et ne collecte aucune donnée. 
                  Tous les traitements sont effectués localement dans votre navigateur.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}