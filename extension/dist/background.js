// extension/src/lib/crypto.ts
var e = "govguide_device_salt_v1";
async function t() {
	return new Promise((t) => {
		chrome.storage.local.get([e], (n) => {
			if (n[e]) {
				let r = n[e];
				t(new Uint8Array(r));
			} else {
				let n = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
				chrome.storage.local.set({ [e]: Array.from(n) }, () => t(n));
			}
		});
	});
}
async function n(e, t) {
	let n = new TextEncoder(), r = await crypto.subtle.importKey("raw", n.encode(e), { name: "PBKDF2" }, !1, ["deriveKey"]);
	return crypto.subtle.deriveKey({
		name: "PBKDF2",
		salt: t,
		iterations: 1e5,
		hash: "SHA-256"
	}, r, {
		name: "AES-GCM",
		length: 256
	}, !1, ["encrypt", "decrypt"]);
}
async function r(e, r) {
	let i = await t(), a = await n(r ? `govguide_pin_${r}` : "govguide_local_device_vault_2026", i), o = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12)), s = new TextEncoder().encode(JSON.stringify(e)), c = await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv: o
	}, a, s), l = {
		iv: Array.from(o),
		cipher: Array.from(new Uint8Array(c)),
		isPinProtected: !!r
	};
	return btoa(JSON.stringify(l));
}
async function i(e, r) {
	try {
		let i = await t(), a = JSON.parse(atob(e)), o = new Uint8Array(a.iv), s = new Uint8Array(a.cipher), c = await n(r ? `govguide_pin_${r}` : "govguide_local_device_vault_2026", i), l = await crypto.subtle.decrypt({
			name: "AES-GCM",
			iv: o
		}, c, s), u = new TextDecoder();
		return JSON.parse(u.decode(l));
	} catch {
		throw Error("Vault decryption failed. Invalid PIN or corrupted data.");
	}
}
// extension/src/lib/vault.ts
var a = "govguide_citizen_vault_encrypted", o = "govguide_extension_session", s = {
	firstName: "Juan",
	middleName: "Santos",
	lastName: "Dela Cruz",
	suffix: "",
	gender: "MALE",
	dateOfBirth: "1994-06-12",
	placeOfBirth: "Manila, Philippines",
	civilStatus: "SINGLE",
	nationality: "FILIPINO",
	fatherFullName: "Roberto Mendoza Dela Cruz",
	fatherFirstName: "Roberto",
	fatherMiddleName: "Mendoza",
	fatherLastName: "Dela Cruz",
	fatherSuffix: "",
	motherMaidenFirstName: "Maria",
	motherMaidenMiddleName: "Gomez",
	motherMaidenLastName: "Santos",
	motherMaidenSuffix: "",
	mobileNumber: "09175550192",
	emailAddress: "juan.delacruz@govguide.ph",
	landline: "(02) 8527-1111",
	region: "National Capital Region (NCR)",
	province: "Metro Manila",
	cityMunicipality: "City of Manila",
	barangay: "Barangay 659-A, Ermita",
	streetHouseNumber: "1024 General Luna Street",
	zipCode: "1000",
	philsysId: "1234-5678-9012-3456",
	tin: "123-456-789-000",
	sssNumber: "03-9876543-2",
	philhealthNumber: "12-345678901-2",
	pagibigMid: "1210-9876-5432",
	passportNumber: "P8921824B"
}, c = {
	userRole: "citizen",
	citizenId: "active",
	officerName: "Consular Officer Maria Teresa Gomez",
	agencyCode: "DFA",
	apiBaseUrl: "http://localhost:3000",
	isOnlineSyncEnabled: !0
};
async function l() {
	return new Promise((e) => {
		chrome.storage.local.get([o], (t) => {
			t.govguide_extension_session ? e({
				...c,
				...t[o]
			}) : e(c);
		});
	});
}
async function u(e) {
	let t = {
		...await l(),
		...e
	};
	return new Promise((e) => {
		chrome.storage.local.set({ [o]: t }, () => {
			e(t);
		});
	});
}
async function d(e) {
	return new Promise((t) => {
		chrome.storage.local.get([a], async (n) => {
			if (n.govguide_citizen_vault_encrypted) try {
				let r = n[a];
				t(await i(r, e));
				return;
			} catch {}
			t(s);
		});
	});
}
async function f(e, t) {
	let n = await r(e, t);
	return new Promise((e) => {
		chrome.storage.local.set({ [a]: n }, () => {
			e();
		});
	});
}
function p(e, t) {
	let n = t || s;
	if (!e || typeof e != "object") return n;
	let r = e.first_name || "", i = e.middle_name || "", a = e.last_name || "", o = e.suffix || "";
	if (!r && e.display_name && e.display_name.trim()) {
		let t = e.display_name.trim().split(/\s+/);
		t.length === 1 ? r = t[0] : t.length === 2 ? (r = t[0], a = t[1]) : t.length >= 3 && (r = t[0], i = t.slice(1, -1).join(" "), a = t[t.length - 1]);
	}
	let c = e.father_first_name || "", l = e.father_middle_name || "", u = e.father_last_name || "", d = e.father_suffix || "", f = e.father_name || "";
	if (!c && f && f.trim()) {
		let e = f.trim().split(/\s+/);
		e.length === 1 ? c = e[0] : e.length === 2 ? (c = e[0], u = e[1]) : e.length >= 3 && (c = e[0], l = e.slice(1, -1).join(" "), u = e[e.length - 1]);
	}
	let p = e.mother_first_name || "", m = e.mother_middle_name || "", h = e.mother_last_name || e.maiden_name || "", g = e.mother_suffix || "", _ = e.mother_maiden_name || "";
	if (!p && _ && _.trim()) {
		let e = _.trim().split(/\s+/);
		e.length === 1 ? p = e[0] : e.length === 2 ? (p = e[0], h = e[1]) : e.length >= 3 && (p = e[0], m = e.slice(1, -1).join(" "), h = e[e.length - 1]);
	}
	return {
		firstName: r || n.firstName,
		middleName: i || n.middleName,
		lastName: a || n.lastName,
		suffix: o || n.suffix,
		gender: e.gender?.toUpperCase() === "FEMALE" ? "FEMALE" : "MALE",
		dateOfBirth: e.birth_date || e.date_of_birth || n.dateOfBirth,
		placeOfBirth: e.place_of_birth || (e.city ? `${e.city}, Philippines` : n.placeOfBirth),
		civilStatus: e.civil_status?.toUpperCase() || n.civilStatus,
		nationality: e.nationality || "FILIPINO",
		fatherFullName: f || [
			c,
			l,
			u,
			d
		].filter(Boolean).join(" ") || n.fatherFullName,
		fatherFirstName: c || n.fatherFirstName,
		fatherMiddleName: l || n.fatherMiddleName,
		fatherLastName: u || n.fatherLastName,
		fatherSuffix: d || n.fatherSuffix,
		motherMaidenFirstName: p || n.motherMaidenFirstName,
		motherMaidenMiddleName: m || n.motherMaidenMiddleName,
		motherMaidenLastName: h || n.motherMaidenLastName,
		motherMaidenSuffix: g || n.motherMaidenSuffix,
		mobileNumber: e.contact_number || e.phone || n.mobileNumber,
		emailAddress: e.email || n.emailAddress,
		landline: e.landline || n.landline,
		region: e.region || n.region,
		province: e.province || n.province,
		cityMunicipality: e.city || n.cityMunicipality,
		barangay: e.barangay || n.barangay,
		streetHouseNumber: e.street_address || e.residential_address || n.streetHouseNumber,
		zipCode: e.zip_code || n.zipCode,
		philsysId: e.philsys_id || e.philsys_card_number || n.philsysId,
		tin: e.tin || e.tin_number || n.tin,
		sssNumber: e.sss_number || n.sssNumber,
		philhealthNumber: e.philhealth_number || n.philhealthNumber,
		pagibigMid: e.pagibig_number || n.pagibigMid,
		passportNumber: e.passport_number || n.passportNumber
	};
}
async function m(e, t) {
	let n = t && t !== "967760de-3912-5aaf-8ce9-48b2a8dd55f0" ? t : "active", r = await fetch(`${e}/api/citizen/details?citizenId=${encodeURIComponent(n)}`);
	if (!r.ok) throw Error(`GovGuide Sync error: ${r.statusText}`);
	let i = await r.json();
	if (i.ok && i.applicant) {
		let e = await d(), t = p(i.applicant, e);
		return await f(t), await u({
			lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
			citizenId: i.applicant.id || n
		}), t;
	}
	throw Error("No applicant profile returned from GovGuide");
}
// extension/src/background/index.ts
chrome.runtime.onInstalled.addListener(() => {
	h();
});
function h() {
	chrome.contextMenus.removeAll(() => {
		chrome.contextMenus.create({
			id: "govguide_root",
			title: "🇵🇭 GovGuide PH Copilot",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_mmn",
			parentId: "govguide_root",
			title: "Paste Mother's Maiden Name",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_philsys",
			parentId: "govguide_root",
			title: "Paste PhilSys National ID",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_philhealth",
			parentId: "govguide_root",
			title: "Paste PhilHealth PIN",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_tin",
			parentId: "govguide_root",
			title: "Paste BIR TIN",
			contexts: ["editable"]
		}), chrome.contextMenus.create({
			id: "govguide_paste_fullname",
			parentId: "govguide_root",
			title: "Paste Full Name",
			contexts: ["editable"]
		});
	});
}
chrome.contextMenus.onClicked.addListener(async (e, t) => {
	if (!t || !t.id) return;
	let n = await d(), r = "";
	switch (e.menuItemId) {
		case "govguide_paste_mmn":
			r = `${n.motherMaidenFirstName} ${n.motherMaidenLastName}`.trim();
			break;
		case "govguide_paste_philsys":
			r = n.philsysId || "";
			break;
		case "govguide_paste_philhealth":
			r = n.philhealthNumber || "";
			break;
		case "govguide_paste_tin":
			r = n.tin || "";
			break;
		case "govguide_paste_fullname": r = `${n.firstName} ${n.middleName} ${n.lastName}`.trim();
	}
	r && chrome.scripting.executeScript({
		target: { tabId: t.id },
		func: (e) => {
			let t = document.activeElement;
			t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) && (t.value = e, t.dispatchEvent(new Event("input", { bubbles: !0 })), t.dispatchEvent(new Event("change", { bubbles: !0 })));
		},
		args: [r]
	});
}), chrome.runtime.onMessage.addListener((e, t, n) => (g(e).then(n).catch((e) => {
	n({ error: e.message || "Unknown background error" });
}), !0));
async function g(e) {
	switch (e.type) {
		case "GET_VAULT":
			try {
				let e = await l();
				if (e.isOnlineSyncEnabled) try {
					let t = e.citizenId && e.citizenId !== "967760de-3912-5aaf-8ce9-48b2a8dd55f0" ? e.citizenId : "active";
					return { vault: await m(e.apiBaseUrl, t) };
				} catch {}
			} catch {}
			return { vault: await d() };
		case "SAVE_VAULT":
			await f(e.payload.vault, e.payload.pin);
			try {
				chrome.runtime.sendMessage({
					type: "VAULT_UPDATED",
					vault: e.payload.vault
				});
			} catch {}
			return { success: !0 };
		case "PUSH_VAULT_FROM_WEB": {
			let { applicant: t, citizenId: n } = e.payload, r = p(t, await d());
			await f(r), await u({
				citizenId: n || t?.id || "active",
				lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			try {
				chrome.runtime.sendMessage({
					type: "VAULT_UPDATED",
					vault: r
				});
			} catch {}
			return {
				success: !0,
				vault: r
			};
		}
		case "GET_SESSION": return { session: await l() };
		case "SET_SESSION": return { session: await u(e.payload) };
		case "SYNC_FROM_GOVGUIDE": {
			let t = await l(), n = e.payload?.citizenId || (t.citizenId && t.citizenId !== "967760de-3912-5aaf-8ce9-48b2a8dd55f0" ? t.citizenId : "active"), r = await m(t.apiBaseUrl, n);
			try {
				chrome.runtime.sendMessage({
					type: "VAULT_UPDATED",
					vault: r
				});
			} catch {}
			return {
				success: !0,
				vault: r
			};
		}
		case "UPDATE_REQUEST_STATUS": {
			let t = await l(), n = await fetch(`${t.apiBaseUrl}/api/agency/requests`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"x-agency-role": "counter_officer"
				},
				body: JSON.stringify(e.payload)
			}), r = await n.json();
			if (!n.ok) throw Error(r.error || "Failed to update agency request status");
			return chrome.notifications.create({
				type: "basic",
				iconUrl: "icons/icon-128.png",
				title: "GovGuide Agency Bridge",
				message: `Status updated to '${e.payload.statusLabel}' for ${e.payload.requestId}`
			}), {
				success: !0,
				data: r.data
			};
		}
		case "SHOW_NOTIFICATION": return chrome.notifications.create({
			type: "basic",
			iconUrl: "icons/icon-128.png",
			title: e.payload.title,
			message: e.payload.message
		}), { success: !0 };
		default: return { unhandled: !0 };
	}
}
