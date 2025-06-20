        // ApiClient identique à celui utilisé pour les clients/contacts
        export class ApiClient {
            constructor(baseUrl = 'http://192.168.50.191:5005') {
                this.baseUrl = baseUrl.replace(/\/$/, '');
                this.headers = {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                };
                console.log("[ApiClient] Initialisé avec baseUrl:", this.baseUrl);
            }
            async _makeRequest(payload) {
                const url = `${this.baseUrl}/api`;
                console.log("[ApiClient] Envoi requête:", { url, payload });
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: this.headers,
                        body: JSON.stringify(payload),
                    });
                    console.log("[ApiClient] Statut HTTP:", response.status);
                    if (!response.ok) {
                        const text = await response.text();
                        console.error("[ApiClient] Erreur API:", text);
                        throw new Error(`API error: ${response.status} - ${text.substring(0, 500)}`);
                    }
                    const json = await response.json();
                    console.log("[ApiClient] Réponse JSON:", json);
                    return json;
                } catch (error) {
                    console.error("[ApiClient] Erreur réseau/API:", error);
                    throw new Error(`Network or API error: ${error.message}`);
                }
            }
            async read({ schema, table, primaryKey, where = null, params = null, orderBy = null, limit = 100, offset = 0, recordId = null, debug = false, }) {
                const query = {};
                if (where) query.where = where;
                if (params) query.params = params;
                if (orderBy) query.order_by = orderBy;
                query.limit = limit;
                query.offset = offset;
                const payload = {
                    schema,
                    table,
                    primary_key: primaryKey,
                    action: 'read',
                    query,
                    debug,
                };
                if (recordId !== null) payload.record_id = recordId;
                console.log("[ApiClient.read] Payload:", payload);
                return this._makeRequest(payload);
            }
            async create({ schema, table, primaryKey, data, debug = false }) {
                const payload = {
                    schema,
                    table,
                    primary_key: primaryKey,
                    action: 'create',
                    data,
                    debug,
                };
                console.log("[ApiClient.create] Payload:", payload);
                return this._makeRequest(payload);
            }
            async update({ schema, table, primaryKey, data, recordId = null, where = null, params = [], debug = false }) {
                const payload = {
                    schema,
                    table,
                    primary_key: primaryKey,
                    action: 'update',
                    data,
                    debug,
                };
                if (recordId !== null) {
                    payload.record_id = recordId;
                } else if (where) {
                    payload.query = { where, params };
                } else {
                    throw new Error('recordId or where must be provided');
                }
                console.log("[ApiClient.update] Payload:", payload);
                return this._makeRequest(payload);
            }
            async delete({ schema, table, primaryKey, recordId = null, where = null, params = [], debug = false }) {
                const payload = {
                    schema,
                    table,
                    primary_key: primaryKey,
                    action: 'delete',
                    debug,
                };
                if (recordId !== null) {
                    payload.record_id = recordId;
                } else if (where) {
                    payload.query = { where, params };
                } else {
                    throw new Error('recordId or where must be provided');
                }
                console.log("[ApiClient.delete] Payload:", payload);
                return this._makeRequest(payload);
            }

            async rawQuery(sql, params = [], debug = false) {
                const payload = {
                    action: 'raw',
                    query: { sql, params },
                    debug,
                };
                console.log("[ApiClient.rawQuery] Payload:", payload);
                return this._makeRequest(payload);
            }
        }

        // Initialize ApiClient (using the ngrok URL as provided in the original code)
        const client = new ApiClient('https://seiweb.online'); // Updated Base URL

        // DOM References for vehicles section
        const productsList_vehicules = document.getElementById('productsList_vehicules');
        const productsLoadingSpinner_vehicules = document.getElementById('productsLoadingSpinner_vehicules');
        const searchInput = document.getElementById('productSearchInput_vehicules');
        const categoryFilter = document.getElementById('productCategoryFilter_vehicules');
        const addVehiculeBtn = document.getElementById('addVehiculeBtn');

        // CRUD Modal elements
        const vehiculeModal = new bootstrap.Modal(document.getElementById('vehiculeModal'));
        const vehiculeModalLabel = document.getElementById('vehiculeModalLabel');
        const vehiculeForm = document.getElementById('vehiculeForm');
        const vehiculeUnitIndex = document.getElementById('vehiculeUnitIndex');
        const vehiculeNom = document.getElementById('vehiculeNom');
        const vehiculeCategorie = document.getElementById('vehiculeCategorie');
        const vehiculeMarque = document.getElementById('vehiculeMarque');
        const vehiculeModele = document.getElementById('vehiculeModele');
        // Removed vehiculeDescription and related elements as per user's final version

        // Custom Confirmation and Alert Modals
        const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        const confirmationMessage = document.getElementById('confirmationMessage');
        const confirmActionBtn = document.getElementById('confirmActionBtn');
        const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
        const alertMessage = document.getElementById('alertMessage');

        // Store currently selected unitIndex for confirmation
        let pendingDeleteUnitIndex = null;

        // CRUD state: Declare currentVehiculesData here
        let currentVehiculesData = [];

        // Display vehicle cards
        function renderVehiculeCards(rows) {
            if (!Array.isArray(rows) || rows.length === 0) {
                return `<div class="col text-center py-5"><p class="text-muted">Aucun véhicule disponible.</p></div>`;
            }
            return rows.map(veh => `
                <div class="col">
                    <div class="card h-full shadow-sm hover:shadow-md transition-shadow duration-300 ease-in-out">
                        <div class="card-body d-flex flex-column p-4">
                            <h6 class="card-title mb-2 text-lg font-bold text-gray-800">${veh.NOM || veh.nom || veh.unitname || '(Sans nom)'}</h6>
                            <p class="card-text mb-1 text-sm text-gray-600"><strong>ID:</strong> ${veh.unit_index || veh.unitid || veh.id || 'N/A'}</p>
                            <p class="card-text mb-1 text-sm text-gray-600"><strong>Catégorie:</strong> ${veh.CATEGORIE || veh.categorie || veh.category || veh.cat || 'N/A'}</p>
                            <p class="card-text mb-1 text-sm text-gray-600"><strong>Marque:</strong> ${veh.MARQUE || veh.marque || veh.brand || 'N/A'}</p>
                            <p class="card-text mb-1 text-sm text-gray-600"><strong>Modèle:</strong> ${veh.MODELE || veh.modele || veh.model || 'N/A'}</p>
                            <div class="mt-auto d-flex justify-content-end gap-2 pt-3">
                                <button type="button" class="btn btn-sm btn-info edit-vehicule-btn bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-md transition-colors" title="Modifier" data-unit-index="${veh.unit_index}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button type="button" class="btn btn-sm btn-danger delete-vehicule-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md transition-colors" title="Supprimer" data-unit-index="${veh.unit_index}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Fetch and render vehicles
        async function fetchAndRenderVehicules(searchTerm = '', category = '') {
            console.log("[fetchAndRenderVehicules] searchTerm:", searchTerm, "category:", category);
            productsLoadingSpinner_vehicules.style.display = '';
            productsList_vehicules.innerHTML = '';
            try {
                let whereClause = null;
                let params = [];
                if (searchTerm) {
                    whereClause = `(LOWER(NOM) LIKE ? OR LOWER(unit_index) LIKE ? OR LOWER(MARQUE) LIKE ? OR LOWER(MODELE) LIKE ?)`;
                    const likeTerm = `%${searchTerm.toLowerCase()}%`;
                    params.push(likeTerm, likeTerm, likeTerm, likeTerm);
                }
                if (category) {
                    if (whereClause) {
                        whereClause += ` AND LOWER(CATEGORIE) = ?`; // Reverted to exact match for category based on user's last provided code
                    } else {
                        whereClause = `LOWER(CATEGORIE) = ?`; // Reverted to exact match for category
                    }
                    params.push(category.toLowerCase());
                }
                console.log("[fetchAndRenderVehicules] whereClause:", whereClause, "params:", params);
                const result = await client.read({
                    schema: 'bdm',
                    table: 'unit',
                    primaryKey: 'unit_index',
                    where: whereClause,
                    params: params,
                    orderBy: 'NOM',
                    limit: 100,
                    debug: true
                });
                console.log("[fetchAndRenderVehicules] Résultat:", result);
                if (result && Array.isArray(result.rows)) {
                    currentVehiculesData = result.rows;
                    productsList_vehicules.innerHTML = renderVehiculeCards(currentVehiculesData);
                } else {
                    currentVehiculesData = [];
                    productsList_vehicules.innerHTML = `<div class="col text-center py-5"><p class="text-muted">Aucun véhicule trouvé ou erreur lors du chargement.</p></div>`;
                }
            } catch (err) {
                console.error("[fetchAndRenderVehicules] Erreur:", err);
                showAlert(`Erreur de chargement des véhicules: ${err.message}`);
                productsList_vehicules.innerHTML = `<div class="col text-center py-5"><p class="text-muted">Erreur de chargement des véhicules.</p></div>`;
            } finally {
                productsLoadingSpinner_vehicules.style.display = 'none';
            }
        }

        // Populate category filter
        async function populateVehiculeCategories() {
            try {
                const result = await client.rawQuery("SELECT DISTINCT CATEGORIE FROM bdm.unit WHERE CATEGORIE IS NOT NULL AND CATEGORIE != ''", [], true);
                console.log("[populateVehiculeCategories] Résultat:", result);
                if (result && Array.isArray(result.rows)) {
                    categoryFilter.innerHTML = '<option value="">Toutes Catégories</option>';
                    result.rows.forEach(row => {
                        if (row.CATEGORIE) {
                            categoryFilter.innerHTML += `<option value="${row.CATEGORIE}">${row.CATEGORIE}</option>`;
                        }
                    });
                }
            } catch (err) {
                console.error("[populateVehiculeCategories] Erreur:", err);
                showAlert(`Erreur lors du chargement des catégories: ${err.message}`);
            }
        }

        // Show custom alert modal
        function showAlert(message) {
            alertMessage.textContent = message;
            alertModal.show();
        }

        // Show custom confirmation modal
        function showConfirmation(message, onConfirm) {
            confirmationMessage.textContent = message;
            // Remove previous event listener to prevent multiple calls
            confirmActionBtn.onclick = null;
            confirmActionBtn.onclick = () => {
                confirmationModal.hide();
                onConfirm();
            };
            confirmationModal.show();
        }

        // Handle Add/Edit button click
        addVehiculeBtn.addEventListener('click', () => {
            vehiculeModalLabel.textContent = 'Ajouter un Véhicule';
            vehiculeUnitIndex.value = ''; // Clear for new vehicle
            vehiculeForm.reset(); // Clear form fields
            // No vehiculeDescription to clear as per user's final version
        });

        // Handle Edit/Delete actions (delegated event listener)
        productsList_vehicules.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-vehicule-btn');
            const deleteBtn = e.target.closest('.delete-vehicule-btn');

            if (editBtn) {
                const unitIndex = editBtn.dataset.unitIndex;
                const veh = currentVehiculesData.find(v => String(v.unit_index) === String(unitIndex));
                if (veh) {
                    vehiculeModalLabel.textContent = 'Modifier un Véhicule';
                    vehiculeUnitIndex.value = veh.unit_index || '';
                    vehiculeNom.value = veh.NOM || veh.nom || veh.unitname || '';
                    vehiculeCategorie.value = veh.CATEGORIE || veh.categorie || veh.category || veh.cat || '';
                    vehiculeMarque.value = veh.MARQUE || veh.marque || veh.brand || '';
                    vehiculeModele.value = veh.MODELE || veh.modele || veh.model || '';
                    // No vehiculeDescription to populate as per user's final version
                    vehiculeModal.show();
                } else {
                    showAlert('Véhicule non trouvé pour édition.');
                }
            } else if (deleteBtn) {
                const unitIndex = deleteBtn.dataset.unitIndex;
                pendingDeleteUnitIndex = unitIndex; // Store for confirmation
                showConfirmation('Êtes-vous sûr de vouloir supprimer ce véhicule ?', async () => {
                    if (pendingDeleteUnitIndex) {
                        try {
                            await client.delete({
                                schema: 'bdm',
                                table: 'unit',
                                primaryKey: 'unit_index',
                                recordId: parseInt(pendingDeleteUnitIndex),
                                debug: true
                            });
                            showAlert('Véhicule supprimé avec succès!');
                            fetchAndRenderVehicules(searchInput.value, categoryFilter.value);
                        } catch (err) {
                            console.error("[delete-vehicule-btn] Erreur suppression:", err);
                            showAlert('Erreur suppression: ' + err.message);
                        } finally {
                            pendingDeleteUnitIndex = null;
                        }
                    }
                });
            }
        });

        // The Gemini API integration for generating descriptions has been removed as it was not in the provided final version.

        // Handle form submission for Add/Edit
        vehiculeForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default form submission

            const unitIndex = vehiculeUnitIndex.value;
            const data = {
                NOM: vehiculeNom.value,
                CATEGORIE: vehiculeCategorie.value,
                MARQUE: vehiculeMarque.value,
                MODELE: vehiculeModele.value,
                // No DESCRIPTION field to include as per user's final version
            };

            try {
                if (unitIndex) { // Edit existing vehicle
                    await client.update({
                        schema: 'bdm',
                        table: 'unit',
                        primaryKey: 'unit_index',
                        recordId: parseInt(unitIndex),
                        data: data,
                        debug: true
                    });
                    showAlert('Véhicule mis à jour avec succès!');
                } else { // Add new vehicle
                    await client.create({
                        schema: 'bdm',
                        table: 'unit',
                        primaryKey: 'unit_index', // Assuming this is auto-incremented or handled by API on create
                        data: data,
                        debug: true
                    });
                    showAlert('Véhicule ajouté avec succès!');
                }
                vehiculeModal.hide(); // Close modal
                fetchAndRenderVehicules(searchInput.value, categoryFilter.value); // Refresh list
            } catch (err) {
                console.error("[vehiculeForm] Erreur sauvegarde:", err);
                showAlert('Erreur lors de la sauvegarde du véhicule: ' + err.message);
            }
        });


        // Initial data load and event listeners
        document.addEventListener('DOMContentLoaded', () => {
            fetchAndRenderVehicules();
            populateVehiculeCategories();
        });

        searchInput.addEventListener('input', () => {
            fetchAndRenderVehicules(searchInput.value, categoryFilter.value);
        });

        categoryFilter.addEventListener('change', () => {
            fetchAndRenderVehicules(searchInput.value, categoryFilter.value);
        });

