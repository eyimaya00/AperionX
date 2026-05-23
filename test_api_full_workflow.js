const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'gizli_anahtar';
const API_URL = 'http://localhost:3000/api/experiments';

// Generate token for user 1 (admin role)
const token = jwt.sign(
    { id: 1, email: 'admin@aperion.com', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function runTests() {
    console.log("--- STARTING EXPERIMENT API LIFE-CYCLE TESTS ---");
    let expId = null;

    try {
        // 1. ADD EXPERIMENT (POST)
        console.log("\n1. Testing POST /add...");
        const addRes = await fetch(`${API_URL}/add`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Test Experiment ' + Date.now(),
                category: 'Kimya',
                objective: 'Test the api flow',
                materials: 'Water, Glass',
                procedure_steps: '<p>Step 1: Pour water.</p>',
                results: '<p>Result: Water is in glass.</p>',
                conclusion: 'Success',
                excerpt: 'A test experiment.',
                status: 'draft',
                tags: 'test,chemistry'
            })
        });

        console.log("POST Response Status:", addRes.status);
        const addData = await addRes.json();
        console.log("POST Response Body:", addData);

        if (!addRes.ok) {
            throw new Error("POST /add failed!");
        }
        expId = addData.id;
        console.log(`Experiment created successfully with ID: ${expId}`);

        // 2. UPDATE EXPERIMENT (PUT)
        console.log("\n2. Testing PUT /update/:id...");
        const updateRes = await fetch(`${API_URL}/update/${expId}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Updated Test Experiment',
                category: 'Fizik',
                procedure_steps: '<p>Step 1: Refined pour water.</p>'
            })
        });

        console.log("PUT Response Status:", updateRes.status);
        const updateData = await updateRes.json();
        console.log("PUT Response Body:", updateData);

        if (!updateRes.ok) {
            throw new Error("PUT /update failed!");
        }

        // 3. SOFT DELETE / TRASH (PATCH)
        console.log("\n3. Testing PATCH /trash/:id...");
        const trashRes = await fetch(`${API_URL}/trash/${expId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        console.log("PATCH /trash Response Status:", trashRes.status);
        const trashData = await trashRes.json();
        console.log("PATCH /trash Response Body:", trashData);

        if (!trashRes.ok) {
            throw new Error("PATCH /trash failed!");
        }

        // 4. RESTORE (PATCH)
        console.log("\n4. Testing PATCH /restore/:id...");
        const restoreRes = await fetch(`${API_URL}/restore/${expId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        console.log("PATCH /restore Response Status:", restoreRes.status);
        const restoreData = await restoreRes.json();
        console.log("PATCH /restore Response Body:", restoreData);

        if (!restoreRes.ok) {
            throw new Error("PATCH /restore failed!");
        }

        // Move it back to trash to test permanent delete
        console.log("\nMoving back to trash to test permanent delete...");
        await fetch(`${API_URL}/trash/${expId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        // 5. PERMANENT DELETE (DELETE)
        console.log("\n5. Testing DELETE /permanent/:id...");
        const permRes = await fetch(`${API_URL}/permanent/${expId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        console.log("DELETE /permanent Response Status:", permRes.status);
        const permData = await permRes.json();
        console.log("DELETE /permanent Response Body:", permData);

        if (!permRes.ok) {
            throw new Error("DELETE /permanent failed!");
        }

        console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY!");

    } catch (e) {
        console.error("\n❌ TEST FAILED:", e.message);
    }
}

runTests();
