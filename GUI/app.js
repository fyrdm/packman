// app.js

document.addEventListener('DOMContentLoaded', () => {
    // State
    const manifestState = {
        version: "1.0.0",
        timestamp: "",
        files: []
    };

    // Elements
    const manVersionInput = document.getElementById('man-version');
    const manTimestampInput = document.getElementById('man-timestamp');
    const artTypeSelect = document.getElementById('art-type');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields');
    const addArtifactForm = document.getElementById('add-artifact-form');
    const manifestPreview = document.getElementById('manifest-preview');
    const artifactCount = document.getElementById('artifact-count');
    const btnBrowseFile = document.getElementById('btn-browse-file');
    const filePicker = document.getElementById('art-file-picker');
    const artPathInput = document.getElementById('art-path');
    
    const btnBundle = document.getElementById('btn-bundle');
    const terminalSection = document.getElementById('terminal-section');
    const terminalOutput = document.getElementById('terminal-output');
    const packageNameInput = document.getElementById('package-name');

    // Initialize global timestamp if empty in Istanbul Timezone
    if (!manifestState.timestamp) {
        // Create an ISO string adjusted for Europe/Istanbul timezone
        const now = new Date();
        const estDateStr = now.toLocaleString("sv-SE", { timeZone: "Europe/Istanbul" });
        // Format of sv-SE is YYYY-MM-DD hh:mm:ss, let's format it to ISO 8601 with +03:00
        const formattedDate = estDateStr.replace(' ', 'T') + '+03:00';
        manifestState.timestamp = formattedDate;
        manTimestampInput.value = manifestState.timestamp;
    }

    // Syntax Highlight helper for JSON
    function syntaxHighlight(json) {
        if (typeof json != 'string') {
            json = JSON.stringify(json, undefined, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    // Render Preview
    function renderPreview() {
        manifestPreview.innerHTML = syntaxHighlight(manifestState);
        artifactCount.textContent = `${manifestState.files.length} Artifact${manifestState.files.length !== 1 ? 's' : ''}`;
    }

    // Global Manifest Input Listeners
    manVersionInput.addEventListener('input', (e) => {
        manifestState.version = e.target.value;
        renderPreview();
    });
    manTimestampInput.addEventListener('input', (e) => {
        manifestState.timestamp = e.target.value;
        renderPreview();
    });

    // Dynamic Form Generation Based on Type
    artTypeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        dynamicFieldsContainer.innerHTML = '';
        dynamicFieldsContainer.classList.remove('hidden');

        let html = '';
        if (type === 'dockerImage' || type === 'KVMdockerImage') {
            html += `
                <div class="form-group">
                    <label for="dyn-imageName">Image Name</label>
                    <input type="text" id="dyn-imageName" required placeholder="e.g. backend-api">
                </div>
                <div class="form-group">
                    <label for="dyn-imageTag">Image Tag</label>
                    <input type="text" id="dyn-imageTag" required placeholder="e.g. v1.2.0">
                </div>
            `;
        } else if (type === 'config') {
            html += `
                <div class="form-group">
                    <label for="dyn-config_class">Config Class</label>
                    <input type="text" id="dyn-config_class" required placeholder="e.g. network-settings">
                </div>
            `;
        } else if (type === 'WAPfirmware') {
            html += `
                <div class="form-group">
                    <label for="dyn-destination">Destination Path</label>
                    <input type="text" id="dyn-destination" required placeholder="e.g. /srv/tftp">
                </div>
                <div class="form-group">
                    <label for="dyn-wapId">WAP ID</label>
                    <input type="text" id="dyn-wapId" required placeholder="e.g. wap0">
                </div>
            `;
        }
        dynamicFieldsContainer.innerHTML = html;
    });

    // Handle File Browsing Dialog Simulator
    btnBrowseFile.addEventListener('click', () => {
        filePicker.click();
    });

    // Hash File asynchronously
    async function calculateSHA256(file) {
        const checksumInput = document.getElementById('art-checksum');
        checksumInput.value = 'Calculating Hash...';
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            checksumInput.value = hashHex;
            return hashHex;
        } catch (error) {
            checksumInput.value = 'Error calculating hash';
            console.error('Hashing failed', error);
        }
    }

    filePicker.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            // Fake absolute path resolution since browser file inputs don't give the full native path
            // but we can simulate the "selected path" experience via file name
            artPathInput.value = `/home/user/downloads/${file.name}`;
            
            // Auto calculate hash
            await calculateSHA256(file);
        }
    });

    // Extract filename from a path string
    function getBasename(pathStr) {
        // Handle both forward slashes and backslashes
        const parts = pathStr.split(/[/\\]/);
        return parts[parts.length - 1];
    }

    // Handle Add Artifact
    addArtifactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const rawPath = document.getElementById('art-path').value.trim();
        const checksum = document.getElementById('art-checksum').value.trim();
        const type = document.getElementById('art-type').value;

        if (checksum === '' || checksum === 'Calculating Hash...' || checksum === 'Error calculating hash') {
            alert('Please wait for the file hash to finish calculating.');
            return;
        }

        // Path transformation logic: extract file base name and append `artifacts/`
        const filename = getBasename(rawPath);
        const manifestPath = `artifacts/${filename}`;

        const newFile = {
            path: manifestPath,
            type,
            checksum
        };

        // Get dynamic fields based on type
        if (type === 'dockerImage' || type === 'KVMdockerImage') {
            newFile.imageName = document.getElementById('dyn-imageName').value;
            newFile.imageTag = document.getElementById('dyn-imageTag').value;
            // The user's specs have path/imageName/imageTag/type/checksum order, but object key order JS is insertion order
            // Let's reorder to match user examples: path, imageName, imageTag, type, checksum (if possible)
            const orderedObj = {
                path: newFile.path,
                imageName: newFile.imageName,
                imageTag: newFile.imageTag,
                type: newFile.type,
                checksum: newFile.checksum
            };
            manifestState.files.push(orderedObj);
        } else if (type === 'config') {
            newFile.config_class = document.getElementById('dyn-config_class').value;
            const orderedObj = {
                path: newFile.path,
                config_class: newFile.config_class,
                type: newFile.type,
                checksum: newFile.checksum
            };
            manifestState.files.push(orderedObj);
        } else if (type === 'WAPfirmware') {
            newFile.destination = document.getElementById('dyn-destination').value;
            newFile.wapId = document.getElementById('dyn-wapId').value;
            const orderedObj = {
                path: newFile.path,
                destination: newFile.destination,
                type: newFile.type,
                wapId: newFile.wapId,
                checksum: newFile.checksum
            };
            manifestState.files.push(orderedObj);
        }

        renderPreview();
        addArtifactForm.reset();
        dynamicFieldsContainer.classList.add('hidden');
        dynamicFieldsContainer.innerHTML = '';
        
        // Show brief success feedback
        const btn = document.getElementById('btn-add-artifact');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>Added! ✓</span>';
        btn.style.background = '#2add9c';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 1500);
    });

    // --- Simulated Build Sequence ---

    function appendLog(message, type = 'info') {
        const line = document.createElement('div');
        line.className = `log-line log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        line.textContent = `[${timestamp}] ${message}`;
        
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    btnBundle.addEventListener('click', async () => {
        if (manifestState.files.length === 0) {
            alert('Please add at least one artifact before bundling.');
            return;
        }

        const pkgName = packageNameInput.value || 'package';

        terminalSection.classList.remove('hidden');
        terminalSection.scrollIntoView({ behavior: 'smooth' });
        terminalOutput.innerHTML = ''; // Clear prev logs
        
        btnBundle.disabled = true;
        btnBundle.innerHTML = '<span class="loading-dots">Building...</span>';

        // Simulated Sequence
        appendLog(`--- Starting build for ${pkgName} ---`, 'info');
        await sleep(600);
        
        appendLog(`> mkdir ${pkgName}`, 'info');
        await sleep(300);
        appendLog(`Created workspace directory /home/faruk/PackMan/${pkgName}`, 'success');
        
        appendLog(`> Copying ${manifestState.files.length} artifacts to folder...`, 'info');
        await sleep(800);
        manifestState.files.forEach(f => {
            appendLog(`  Copied ${f.path}`);
        });

        appendLog(`> Generating manifest.json in workspace...`, 'info');
        await sleep(500);
        appendLog(`Wrote manifest.json (${JSON.stringify(manifestState).length} bytes)`, 'success');

        appendLog(`> Executing ./sign_verify_ssl.sh sign ${pkgName}/manifest.json`, 'info');
        await sleep(1000);
        appendLog(`Signature generated and saved as ${pkgName}/manifest.json.signature`, 'success');

        appendLog(`> zipping contents into ${pkgName}.zip`, 'info');
        await sleep(800);
        appendLog(`Archive created: ${pkgName}.zip`, 'success');

        appendLog(`> ./cipher-engine enc ${pkgName}.zip`, 'info');
        await sleep(1200);
        appendLog(`OUTPUT: Encrypted package successfully.`, 'success');
        appendLog(`Obtained ${pkgName}.enc`, 'success');

        appendLog(`--- Build Sequence Complete ---`, 'success');
        
        btnBundle.disabled = false;
        btnBundle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            <span>Bundle Package</span>
        `;
        
        /* 
        ========================================================================
        REFERENCE IMPLEMENTATION (NODE.JS)
        If this GUI was backed by an Express server or Electron app, the actual
        system execution would look somewhat like this:
        ========================================================================

        const fs = require('fs');
        const { execSync } = require('child_process');
        const path = require('path');

        async function actualBundleExecution(pkgName, manifestData) {
            try {
                const workspaceDir = path.join('/home/faruk/PackMan', pkgName);
                
                // 1. Create Workspace
                if (!fs.existsSync(workspaceDir)){
                    fs.mkdirSync(workspaceDir, { recursive: true });
                }

                // 2. Create artifacts directory and copy files
                const artifactsDir = path.join(workspaceDir, 'artifacts');
                fs.mkdirSync(artifactsDir, { recursive: true });
                // (Assuming user uploaded files or we know absolute paths to copy from)
                // for (let srcFile of uploadedFiles) {
                //      fs.copyFileSync(srcFile, path.join(artifactsDir, path.basename(srcFile)));
                // }

                // 3. Write manifest.json
                const manifestPath = path.join(workspaceDir, 'manifest.json');
                fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf-8');

                // 4. Execute Signing Script
                const signScriptPath = '/home/faruk/PackMan/sign_verify_ssl.sh';
                execSync(`bash ${signScriptPath} sign ${manifestPath}`);
                
                // 5. Zip the Folder
                const zippedPackagePath = path.join('/home/faruk/PackMan', `${pkgName}.zip`);
                execSync(`cd /home/faruk/PackMan && zip -r ${zippedPackagePath} ${pkgName}`);

                // 6. Execute Cipher Engine
                const cipherEnginePath = '/home/faruk/PackMan/cipher-engine';
                execSync(`${cipherEnginePath} enc ${zippedPackagePath}`);
                
                return { success: true, file: `${pkgName}.enc` };
            } catch (err) {
                console.error("Bundling Failed:", err);
                return { success: false, error: err.message };
            }
        }
        */
    });

    // Initial render
    renderPreview();
});
