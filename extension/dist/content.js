(function(){var e=[{modelPattern:/^owner(\.|\[)first/i,fieldKey:`firstName`,label:`Applicant's First Name`},{modelPattern:/^owner(\.|\[)middle/i,fieldKey:`middleName`,label:`Applicant's Middle Name`},{modelPattern:/^owner(\.|\[)last/i,fieldKey:`lastName`,label:`Applicant's Last Name`},{modelPattern:/^owner(\.|\[)suffix/i,fieldKey:`suffix`,label:`Applicant's Suffix`},{modelPattern:/^owner(\.|\[)sex/i,fieldKey:`gender`,label:`Applicant's Sex / Gender`},{modelPattern:/^owner(\.|\[)birthday/i,fieldKey:`dateOfBirth`,label:`Applicant's Date of Birth`},{modelPattern:/^requester(\.|\[)first/i,fieldKey:`firstName`,label:`Requester First Name`},{modelPattern:/^requester(\.|\[)middle/i,fieldKey:`middleName`,label:`Requester Middle Name`},{modelPattern:/^requester(\.|\[)last/i,fieldKey:`lastName`,label:`Requester Last Name`},{modelPattern:/^requester(\.|\[)suffix/i,fieldKey:`suffix`,label:`Requester Suffix`},{modelPattern:/^requester(\.|\[)sex/i,fieldKey:`gender`,label:`Requester Sex / Gender`},{modelPattern:/^requester(\.|\[)birthday/i,fieldKey:`dateOfBirth`,label:`Requester Date of Birth`},{modelPattern:/^requester(\.|\[)mobile/i,fieldKey:`mobileNumber`,label:`Requester Mobile Number`},{modelPattern:/^requester(\.|\[)email/i,fieldKey:`emailAddress`,label:`Requester Email`},{modelPattern:/^father(\.|\[)first/i,fieldKey:`fatherFirstName`,label:`Father's First Name`},{modelPattern:/^father(\.|\[)middle/i,fieldKey:`fatherMiddleName`,label:`Father's Middle Name`},{modelPattern:/^father(\.|\[)last/i,fieldKey:`fatherLastName`,label:`Father's Last Name`},{modelPattern:/^father(\.|\[)suffix/i,fieldKey:`fatherSuffix`,label:`Father's Suffix`},{modelPattern:/^mother(\.|\[)first/i,fieldKey:`motherMaidenFirstName`,label:`Mother's Maiden First Name`},{modelPattern:/^mother(\.|\[)middle/i,fieldKey:`motherMaidenMiddleName`,label:`Mother's Maiden Middle Name`},{modelPattern:/^mother(\.|\[)last/i,fieldKey:`motherMaidenLastName`,label:`Mother's Maiden Last Name`},{modelPattern:/^mother(\.|\[)suffix/i,fieldKey:`motherMaidenSuffix`,label:`Mother's Suffix`},{modelPattern:/^event(\.|\[)province/i,fieldKey:`province`,label:`Place of Birth (Province)`},{modelPattern:/^event(\.|\[)municipality/i,fieldKey:`cityMunicipality`,label:`Place of Birth (City/Municipality)`},{modelPattern:/^event(\.|\[)date/i,fieldKey:`dateOfBirth`,label:`Event Date of Birth`},{modelPattern:/^address(\.|\[)line1/i,fieldKey:`streetHouseNumber`,label:`Delivery Address (Street / House No)`},{modelPattern:/^address(\.|\[)barangay/i,fieldKey:`barangay`,label:`Delivery Barangay`},{modelPattern:/^address(\.|\[)municipality/i,fieldKey:`cityMunicipality`,label:`Delivery City / Municipality`},{modelPattern:/^address(\.|\[)province/i,fieldKey:`province`,label:`Delivery Province`},{modelPattern:/^address(\.|\[)zip/i,fieldKey:`zipCode`,label:`Delivery Zip Code`}],t=[{fieldKey:`motherMaidenLastName`,patterns:[/mother.*maiden.*last/i,/ina.*dalaga.*apelyido/i,/mmn.*last/i,/mother.*last/i,/nanay.*apelyido/i],confidence:.95},{fieldKey:`motherMaidenFirstName`,patterns:[/mother.*maiden.*first/i,/ina.*dalaga.*pangalan/i,/mmn.*first/i,/mother.*first/i],confidence:.95},{fieldKey:`motherMaidenMiddleName`,patterns:[/mother.*maiden.*mid/i,/ina.*dalaga.*gitna/i,/mmn.*mid/i,/mother.*middle/i],confidence:.95},{fieldKey:`motherMaidenLastName`,patterns:[/mother.*maiden/i,/ina.*dalaga/i,/\bmmn\b/i,/mother.*surname/i],confidence:.9},{fieldKey:`fatherFirstName`,patterns:[/father.*first/i,/tatay.*pangalan/i,/ama.*pangalan/i],confidence:.95},{fieldKey:`fatherMiddleName`,patterns:[/father.*mid/i,/tatay.*gitna/i],confidence:.95},{fieldKey:`fatherLastName`,patterns:[/father.*last/i,/father.*surname/i,/tatay.*apelyido/i],confidence:.95},{fieldKey:`fatherFullName`,patterns:[/father.*name/i,/pangalan.*ama/i,/\btatay\b/i,/father.*full/i],confidence:.9},{fieldKey:`firstName`,patterns:[/\bfirst[-_]?name\b/i,/\bfname\b/i,/given[-_]?name/i,/unang[-_]?pangalan/i,/\bpangalan\b/i],confidence:.85},{fieldKey:`middleName`,patterns:[/\bmiddle[-_]?name\b/i,/\bmname\b/i,/gitnang[-_]?pangalan/i],confidence:.85},{fieldKey:`lastName`,patterns:[/\blast[-_]?name\b/i,/\blname\b/i,/\bsurname\b/i,/\bfamily[-_]?name\b/i,/\bapelyido\b/i],confidence:.85},{fieldKey:`suffix`,patterns:[/\bsuffix\b/i,/name[-_]?extension/i,/\bext\b/i],confidence:.8},{fieldKey:`fullName`,patterns:[/\bfull[-_]?name\b/i,/\bapplicant[-_]?name\b/i,/buong[-_]?pangalan/i],confidence:.8},{fieldKey:`gender`,patterns:[/\bgender\b/i,/\bsex\b/i,/\bkasarian\b/i],confidence:.85},{fieldKey:`dateOfBirth`,patterns:[/\bbirth[-_]?date\b/i,/\bdate[-_]?of[-_]?birth\b/i,/\bdob\b/i,/kapanganakan/i,/petsa.*kapanganakan/i],confidence:.9},{fieldKey:`placeOfBirth`,patterns:[/birth[-_]?place/i,/place[-_]?of[-_]?birth/i,/lugar.*kapanganakan/i,/\bpob\b/i],confidence:.85},{fieldKey:`civilStatus`,patterns:[/civil[-_]?status/i,/marital[-_]?status/i,/katayuang[-_]?sibil/i],confidence:.85},{fieldKey:`mobileNumber`,patterns:[/mobile/i,/cellphone/i,/cell[-_]?number/i,/contact[-_]?number/i,/phone[-_]?number/i,/\bcp\b/i,/telepono/i],confidence:.85},{fieldKey:`emailAddress`,patterns:[/\bemail\b/i,/\be-mail\b/i,/email[-_]?address/i],confidence:.95},{fieldKey:`region`,patterns:[/\bregion\b/i,/rehiyon/i],confidence:.8},{fieldKey:`province`,patterns:[/\bprovince\b/i,/lalawigan/i],confidence:.8},{fieldKey:`cityMunicipality`,patterns:[/\bcity\b/i,/\bmunicipality\b/i,/lungsod/i,/\bbayan\b/i],confidence:.8},{fieldKey:`barangay`,patterns:[/\bbarangay\b/i,/\bbrgy\b/i,/\bbgy\b/i],confidence:.9},{fieldKey:`streetHouseNumber`,patterns:[/street/i,/house[-_]?no/i,/address[-_]?line/i,/residential[-_]?address/i,/home[-_]?address/i,/tirahan/i],confidence:.8},{fieldKey:`zipCode`,patterns:[/\bzip\b/i,/\bzip[-_]?code\b/i,/postal[-_]?code/i],confidence:.85},{fieldKey:`philsysId`,patterns:[/philsys/i,/national[-_]?id/i,/\bpsn\b/i,/ephilid/i],confidence:.95},{fieldKey:`philhealthNumber`,patterns:[/philhealth/i,/\bpin\b.*philhealth/i,/\bmdr\b/i],confidence:.95},{fieldKey:`tin`,patterns:[/\btin\b/i,/tax[-_]?identification/i,/bir[-_]?tin/i],confidence:.9},{fieldKey:`sssNumber`,patterns:[/\bsss\b/i,/social[-_]?security/i,/\bcrn\b/i],confidence:.9},{fieldKey:`pagibigMid`,patterns:[/pag[-_]?ibig/i,/\bmid\b/i,/hdmf/i],confidence:.9},{fieldKey:`passportNumber`,patterns:[/passport/i,/passport[-_]?no/i,/pasaporte/i],confidence:.9}];function n(e,t){if(t===`fullName`)return[e.firstName,e.middleName,e.lastName,e.suffix].filter(Boolean).join(` `);if(t===`motherMaidenFullName`)return[e.motherMaidenFirstName,e.motherMaidenMiddleName,e.motherMaidenLastName].filter(Boolean).join(` `);if(t===`fullAddress`)return[e.streetHouseNumber,e.barangay,e.cityMunicipality,e.province,e.zipCode].filter(Boolean).join(`, `);if(t===`fatherFirstName`){if(e.fatherFirstName)return e.fatherFirstName;let t=(e.fatherFullName||``).trim().split(/\s+/);return t.length>1?t.slice(0,-1).join(` `):t[0]||``}if(t===`fatherMiddleName`){if(e.fatherMiddleName)return e.fatherMiddleName;let t=(e.fatherFullName||``).trim().split(/\s+/);return t.length>2?t[1]:``}if(t===`fatherLastName`){if(e.fatherLastName)return e.fatherLastName;let t=(e.fatherFullName||``).trim().split(/\s+/);return t.length>1?t[t.length-1]:``}return t===`fatherSuffix`?e.fatherSuffix||``:t===`motherMaidenSuffix`?e.motherMaidenSuffix||``:e[t]||``}function r(e){let t=e.getAttribute(`wire:model`)||e.getAttribute(`wire:model.live`)||e.getAttribute(`wire:model.defer`)||e.getAttribute(`wire:model.blur`)||e.getAttribute(`x-model`)||e.getAttribute(`data-model`);return t?{model:t,componentId:e.closest(`[wire\\:id]`)?.getAttribute(`wire:id`)||``}:null}function i(e){let t=[],n=r(e);n&&t.push(n.model);for(let n=0;n<e.attributes.length;n++){let r=e.attributes[n];(r.name.startsWith(`wire:`)||r.name.startsWith(`x-`))&&t.push(r.name,r.value)}let i=e.getAttribute(`name`);i&&t.push(i);let a=e.id;a&&t.push(a);let o=e.getAttribute(`placeholder`);o&&t.push(o);let s=e.getAttribute(`aria-label`);s&&t.push(s);let c=e.getAttribute(`title`);if(c&&t.push(c),a){let e=document.querySelector(`label[for="${CSS.escape(a)}"]`);e&&e.textContent&&t.push(e.textContent.trim())}let l=e.closest(`label`);l&&l.textContent&&t.push(l.textContent.trim());let u=e.closest(`[id^="section-"], [wire\\:snapshot], fieldset`);if(u){u.id&&t.push(u.id);let e=u.querySelector(`legend, h2, h3, h4`);e&&e.textContent&&t.push(e.textContent.trim())}let d=e.previousElementSibling;return d&&d.textContent&&d.textContent.length<50&&t.push(d.textContent.trim()),t.join(` `).toLowerCase()}function a(a){let l=window.location.hostname,u=o(l),d=document.querySelector(`[wire\\:snapshot]`);if(d){let e=d.getAttribute(`wire:snapshot`)||``;(e.includes(`pages::generic-form`)||e.includes(`order\\/birth`)||e.includes(`App\\\\Livewire\\\\Forms`))&&(u=`Philippine Statistics Authority (PSA) Online`)}let f=Array.from(document.querySelectorAll(`input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]):not([disabled]), select:not([disabled]), textarea:not([disabled])`)),p=[],m=new Set;return f.forEach((o,l)=>{if(m.has(o))return;let u=r(o),d=i(o);if(u){for(let t of e)if(t.modelPattern.test(u.model)){let e=n(a,t.fieldKey);if(e){let n=c(o,l);p.push({id:`govguide-field-${l}`,fieldKey:t.fieldKey,label:t.label,suggestedValue:e,elementSelector:n,elementTag:o.tagName.toLowerCase(),confidence:.99,confirmed:!0,livewireModel:u.model,livewireComponentId:u.componentId}),m.add(o);return}}}for(let e of t)if(e.patterns.some(e=>e.test(d))){let t=n(a,e.fieldKey);if(t){let n=c(o,l);p.push({id:`govguide-field-${l}`,fieldKey:e.fieldKey,label:s(e.fieldKey),suggestedValue:t,elementSelector:n,elementTag:o.tagName.toLowerCase(),confidence:e.confidence,confirmed:!0,livewireModel:u?.model,livewireComponentId:u?.componentId}),m.add(o);break}}}),{agencyName:u,domain:l,fields:p,totalFieldsFound:p.length}}function o(e){return e.includes(`nbi.gov.ph`)?`National Bureau of Investigation (NBI)`:e.includes(`psa`)||e.includes(`psahelpline`)||e.includes(`psaonline`)?`Philippine Statistics Authority (PSA)`:e.includes(`philhealth`)?`PhilHealth`:e.includes(`dfa.gov.ph`)?`Department of Foreign Affairs (DFA)`:e.includes(`dpwh.gov.ph`)?`Department of Public Works & Highways (DPWH)`:e.includes(`sss.gov.ph`)?`Social Security System (SSS)`:e.includes(`pagibig`)?`Pag-IBIG Fund`:e.includes(`lto.gov.ph`)?`Land Transportation Office (LTO)`:`Philippine Government Portal`}function s(e){return{firstName:`First Name`,middleName:`Middle Name`,lastName:`Last Name`,suffix:`Suffix`,fullName:`Full Name`,dateOfBirth:`Date of Birth`,placeOfBirth:`Place of Birth`,gender:`Gender / Sex`,civilStatus:`Civil Status`,nationality:`Nationality`,fatherFirstName:`Father's First Name`,fatherMiddleName:`Father's Middle Name`,fatherLastName:`Father's Last Name`,fatherSuffix:`Father's Suffix`,fatherFullName:`Father's Full Name`,motherMaidenLastName:`Mother's Maiden Last Name`,motherMaidenFirstName:`Mother's Maiden First Name`,motherMaidenMiddleName:`Mother's Maiden Middle Name`,motherMaidenSuffix:`Mother's Suffix`,motherMaidenFullName:`Mother's Full Maiden Name`,mobileNumber:`Mobile Number`,emailAddress:`Email Address`,region:`Region`,province:`Province`,cityMunicipality:`City / Municipality`,barangay:`Barangay`,streetHouseNumber:`House No. & Street`,zipCode:`Zip Code`,fullAddress:`Full Residential Address`,philsysId:`PhilSys National ID`,tin:`BIR TIN`,sssNumber:`SSS CRN`,philhealthNumber:`PhilHealth PIN`,pagibigMid:`Pag-IBIG Member ID`,passportNumber:`Passport Number`}[e]||String(e)}function c(e,t){let n=e.getAttribute(`wire:model`)||e.getAttribute(`wire:model.live`);if(n)return`${e.tagName.toLowerCase()}[wire\\:model="${CSS.escape(n)}"], ${e.tagName.toLowerCase()}[wire\\:model\\.live="${CSS.escape(n)}"]`;if(e.id)return`#${CSS.escape(e.id)}`;let r=e.getAttribute(`name`);return r?`${e.tagName.toLowerCase()}[name="${CSS.escape(r)}"]`:`data-govguide-idx-${t}`}function l(e,t,n){if(!e||t==null)return!1;if(e.focus(),n?.model&&n?.componentId)try{window.dispatchEvent(new CustomEvent(`__govguide_set_livewire__`,{detail:{wireId:n.componentId,model:n.model,value:t}}))}catch{}if(e instanceof HTMLInputElement&&e.type===`radio`){let n=e.value.toLowerCase().trim(),r=t.toLowerCase().trim();return n===r||r.includes(n)?(e.checked=!0,e.dispatchEvent(new Event(`input`,{bubbles:!0,composed:!0})),e.dispatchEvent(new Event(`change`,{bubbles:!0,composed:!0})),e.dispatchEvent(new Event(`blur`,{bubbles:!0,composed:!0})),d(e),!0):!1}if(e instanceof HTMLInputElement&&e.type===`checkbox`)return e.checked=!!t,e.dispatchEvent(new Event(`change`,{bubbles:!0,composed:!0})),d(e),!0;if(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement){let n=Object.getPrototypeOf(e),r=Object.getOwnPropertyDescriptor(n,`value`)?.set;r?r.call(e,t):e.value=t;try{e.dispatchEvent(new InputEvent(`input`,{bubbles:!0,composed:!0,cancelable:!0,inputType:`insertText`,data:t}))}catch{e.dispatchEvent(new Event(`input`,{bubbles:!0,composed:!0}))}return e.dispatchEvent(new Event(`change`,{bubbles:!0,composed:!0})),e.dispatchEvent(new Event(`blur`,{bubbles:!0,composed:!0})),d(e),!0}if(e instanceof HTMLSelectElement){let n=t.toLowerCase().trim(),r=-1;for(let t=0;t<e.options.length;t++){let i=e.options[t],a=i.text.toLowerCase().trim(),o=i.value.toLowerCase().trim();if(a===n||o===n||n.includes(`manila`)&&(a.includes(`manila`)||o.includes(`manila`))||n.includes(`filipino`)&&(a.includes(`ph`)||o===`608`||a.includes(`philippines`))){r=t;break}(a.includes(n)||n.includes(a))&&(r=t)}if(r>=0)return e.selectedIndex=r,e.dispatchEvent(new Event(`input`,{bubbles:!0,composed:!0})),e.dispatchEvent(new Event(`change`,{bubbles:!0,composed:!0})),e.dispatchEvent(new Event(`blur`,{bubbles:!0,composed:!0})),d(e),!0}return!1}function u(e){let t=0;return e.forEach(e=>{if(!e.confirmed)return;let n=null;if(e.elementSelector)try{n=document.querySelector(e.elementSelector)}catch{}!n&&e.livewireModel&&(n=document.querySelector(`[wire\\:model="${CSS.escape(e.livewireModel)}"], [wire\\:model\\.live="${CSS.escape(e.livewireModel)}"], [wire\\:model\\.defer="${CSS.escape(e.livewireModel)}"]`)),n&&l(n,e.suggestedValue,{model:e.livewireModel,componentId:e.livewireComponentId})&&t++}),{filledCount:t,totalCount:e.length}}function d(e){let t=e.style.outline,n=e.style.transition;e.style.transition=`all 0.3s ease`,e.style.outline=`2px solid #10b981`,e.style.backgroundColor=`#ecfdf5`,setTimeout(()=>{e.style.outline=t,e.style.backgroundColor=``,e.style.transition=n},1800)}var f=class{host=null;shadow=null;detection=null;isModalOpen=!1;onStatusUpdateRequested;constructor(e){this.onStatusUpdateRequested=e?.onStatusUpdateRequested,this.initShadowHost()}initShadowHost(){let e=document.getElementById(`govguide-copilot-host`);e||(e=document.createElement(`div`),e.id=`govguide-copilot-host`,e.style.all=`initial`,e.style.position=`fixed`,e.style.zIndex=`2147483647`,e.style.top=`0`,e.style.left=`0`,e.style.pointerEvents=`none`,document.body.appendChild(e)),this.host=e,this.shadow=e.attachShadow({mode:`open`})}showPill(e){this.detection=e,this.render()}showAgencyRibbon(e,t){if(!this.shadow)return;let n=this.shadow.querySelector(`#govguide-agency-ribbon`);n||(n=document.createElement(`div`),n.id=`govguide-agency-ribbon`,this.shadow.appendChild(n)),n.innerHTML=`
      <style>
        .ribbon {
          pointer-events: auto;
          position: fixed;
          top: 12px;
          right: 20px;
          background: #0f172a;
          color: #f8fafc;
          padding: 8px 16px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          border: 1px solid #334155;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          z-index: 2147483647;
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ribbon-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .ribbon-btn:hover {
          background: #1d4ed8;
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
      <div class="ribbon">
        <span>🏢 <strong>GovGuide Officer Bridge:</strong> Ref <code>${e}</code></span>
        <button id="open-stepper-btn" class="ribbon-btn">⚡ Advance Status Bar</button>
      </div>
    `;let r=n.querySelector(`#open-stepper-btn`);r&&r.addEventListener(`click`,()=>{this.onStatusUpdateRequested?this.onStatusUpdateRequested(e):chrome.runtime.sendMessage({type:`SHOW_NOTIFICATION`,payload:{title:`Agency Officer Bridge`,message:`Open GovGuide Extension popup to advance status for Ref #${e}.`}})})}render(){if(!this.shadow||!this.detection||this.detection.totalFieldsFound===0)return;let e=this.detection.totalFieldsFound;this.shadow.innerHTML=`
      <style>
        .pill {
          pointer-events: auto;
          position: fixed;
          top: 140px;
          right: 0;
          background: #0f172a;
          color: #ffffff;
          padding: 8px 14px 8px 12px;
          border-radius: 20px 0 0 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: -4px 6px 18px rgba(15, 23, 42, 0.25);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          font-weight: 600;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s;
          border: 1px solid #1e293b;
          border-right: none;
        }
        .pill:hover {
          transform: translateX(-4px);
          background: #1e293b;
        }
        .flag-dot {
          background: #2563eb;
          color: #ffffff;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
        }
        .badge {
          background: #10b981;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
        }
        .backdrop {
          pointer-events: auto;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          z-index: 2147483647;
        }
        .modal {
          background: #ffffff;
          color: #0f172a;
          width: 90%;
          max-width: 460px;
          max-height: 85vh;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .modal-header {
          padding: 16px 20px;
          background: #0f172a;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-title {
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .modal-body {
          padding: 16px 20px;
          overflow-y: auto;
          flex: 1;
        }
        .field-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .field-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        .field-info {
          flex: 1;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .field-val {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          margin-top: 2px;
          word-break: break-word;
        }
        .modal-footer {
          padding: 14px 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
        }
        .btn-autofill {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-autofill:hover {
          background: #1d4ed8;
        }
        .btn-cancel {
          background: transparent;
          color: #64748b;
          border: 1px solid #cbd5e1;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-cancel:hover {
          background: #f1f5f9;
        }
      </style>

      <div id="govguide-pill" class="pill" title="Click to review and autofill">
        <span class="flag-dot">⚡</span>
        <span>Autofill Form</span>
        <span class="badge">${e}</span>
      </div>

      ${this.isModalOpen?this.renderModalHTML():``}
    `,this.attachEvents()}renderModalHTML(){return this.detection?`
      <div class="backdrop" id="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">
              <span>🇵🇭</span>
              <span>GovGuide PH Bilis-Pila Copilot</span>
            </div>
            <button id="close-modal-x" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">&times;</button>
          </div>

          <div class="modal-body">
            <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 12px;">
              Detected <strong>${this.detection.totalFieldsFound}</strong> matching fields for <em>${this.detection.agencyName}</em>. Review before injecting:
            </p>

            <div class="field-list">
              ${this.detection.fields.map(e=>`
                <div class="field-item">
                  <input type="checkbox" id="check-${e.id}" data-id="${e.id}" ${e.confirmed?`checked`:``} style="margin-top: 3px; cursor: pointer;" />
                  <div class="field-info">
                    <div class="field-label">${e.label}</div>
                    <div class="field-val">${e.suggestedValue}</div>
                  </div>
                </div>
              `).join(``)}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" id="close-modal-btn">Cancel</button>
            <button class="btn-autofill" id="do-autofill-btn">
              <span>⚡</span>
              <span>Autofill ${this.detection.fields.filter(e=>e.confirmed).length} Fields</span>
            </button>
          </div>
        </div>
      </div>
    `:``}attachEvents(){if(!this.shadow)return;let e=this.shadow.querySelector(`#govguide-pill`);e&&e.addEventListener(`click`,()=>{this.isModalOpen=!0,this.render()});let t=this.shadow.querySelector(`#modal-backdrop`);t&&t.addEventListener(`click`,e=>{e.target===t&&(this.isModalOpen=!1,this.render())}),[this.shadow.querySelector(`#close-modal-btn`),this.shadow.querySelector(`#close-modal-x`)].forEach(e=>{e&&e.addEventListener(`click`,()=>{this.isModalOpen=!1,this.render()})}),this.detection?.fields.forEach(e=>{let t=this.shadow?.querySelector(`#check-${e.id}`);t&&t.addEventListener(`change`,()=>{e.confirmed=t.checked;let n=this.shadow?.querySelector(`#do-autofill-btn`);n&&this.detection&&(n.innerHTML=`<span>⚡</span><span>Autofill ${this.detection.fields.filter(e=>e.confirmed).length} Fields</span>`)})});let n=this.shadow.querySelector(`#do-autofill-btn`);n&&this.detection&&n.addEventListener(`click`,()=>{let e=u(this.detection.fields);this.isModalOpen=!1,this.render(),chrome.runtime.sendMessage({type:`SHOW_NOTIFICATION`,payload:{title:`GovGuide PH Autofill Complete`,message:`Successfully populated ${e.filledCount} fields into ${this.detection.agencyName}.`}})})}},p=null,m=null,h=null,g=null;function _(){let e=(document.body?document.body.innerText:``).match(/\b(REQ-[A-Z0-9-]+|DFA-[A-Z0-9-]+|NBI-[A-Z0-9-]+|PSA-[A-Z0-9-]+|PH-[A-Z0-9-]+)\b/i);return e?e[1]:null}function v(){if(document.getElementById(`govguide-livewire-bridge`))return;let e=document.createElement(`script`);e.id=`govguide-livewire-bridge`,e.textContent=`
    window.addEventListener('__govguide_set_livewire__', function(e) {
      if (!e || !e.detail) return;
      var d = e.detail;
      if (window.Livewire && d.wireId && d.model) {
        try {
          var comp = window.Livewire.find(d.wireId);
          if (comp && typeof comp.set === 'function') {
            comp.set(d.model, d.value);
          }
        } catch(err) {
          // fallback to standard DOM events
        }
      }
    });
  `,(document.head||document.documentElement).appendChild(e)}async function y(){p=new f,v();let e=_();if(e&&(p.showAgencyRibbon(e),chrome.runtime.sendMessage({type:`DETECTED_REFERENCE_NUMBER`,payload:{referenceNumber:e}})),chrome.runtime.sendMessage({type:`GET_VAULT`},e=>{e&&e.vault&&(h=e.vault,b(e.vault),x())}),chrome.runtime.onMessage.addListener((e,t,n)=>{if(e.type===`DETECT_FIELDS_REQUEST`)return h?n({summary:b(h)}):chrome.runtime.sendMessage({type:`GET_VAULT`},e=>{e&&e.vault&&(h=e.vault,n({summary:b(e.vault)}))}),!0;if(e.type===`TRIGGER_AUTOFILL`)return n({success:!0,...u(e.payload.fields)}),!0}),window.addEventListener(`message`,e=>{if(e.data&&e.data.type===`GOVGUIDE_MY_DETAILS_UPDATED`){let{applicant:t,citizenId:n}=e.data;t&&chrome.runtime.sendMessage({type:`PUSH_VAULT_FROM_WEB`,payload:{applicant:t,citizenId:n||t.id}},e=>{e&&e.vault&&(h=e.vault,console.log(`[GovGuide Extension] Live synced with updated My Details from web app.`),p&&m&&m.totalFieldsFound>0&&b(e.vault))})}}),typeof window<`u`&&(window.location.origin.includes(`localhost:3000`)||window.location.origin.includes(`govguide`)))try{let e=localStorage.getItem(`govguide_active_applicant`),t=localStorage.getItem(`govguide_active_citizen_id`);if(e){let n=JSON.parse(e);n&&typeof n==`object`&&chrome.runtime.sendMessage({type:`PUSH_VAULT_FROM_WEB`,payload:{applicant:n,citizenId:t||n.id||`active`}})}}catch{}}function b(e){return m=a(e),m.totalFieldsFound>0&&p&&p.showPill(m),m}function x(){window.addEventListener(`section-shown`,()=>{S()}),new MutationObserver(e=>{let t=!1;for(let n of e)if(n.type===`childList`&&n.addedNodes.length>0||n.type===`attributes`&&(n.attributeName===`wire:snapshot`||n.attributeName===`class`||n.attributeName===`style`)){t=!0;break}t&&S()}).observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:[`wire:snapshot`,`class`,`style`,`id`]})}function S(){g&&clearTimeout(g),g=setTimeout(()=>{h&&b(h)},350)}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,y):y()})();