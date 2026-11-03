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
	firstName: "",
	middleName: "",
	lastName: "",
	suffix: "",
	gender: "MALE",
	dateOfBirth: "",
	placeOfBirth: "",
	civilStatus: "SINGLE",
	nationality: "FILIPINO",
	fatherFullName: "",
	fatherFirstName: "",
	fatherMiddleName: "",
	fatherLastName: "",
	fatherSuffix: "",
	motherMaidenFirstName: "",
	motherMaidenMiddleName: "",
	motherMaidenLastName: "",
	motherMaidenSuffix: "",
	mobileNumber: "",
	emailAddress: "",
	landline: "",
	region: "",
	province: "",
	cityMunicipality: "",
	barangay: "",
	streetHouseNumber: "",
	zipCode: "",
	philsysId: "",
	tin: "",
	sssNumber: "",
	philhealthNumber: "",
	pagibigMid: "",
	passportNumber: ""
}, c = {
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
}, l = {
	userRole: "guest",
	isAuthenticated: !1,
	citizenId: "active",
	apiBaseUrl: "http://localhost:3000",
	isOnlineSyncEnabled: !0
};
async function u() {
	return new Promise((e) => {
		chrome.storage.local.get([o], (t) => {
			t.govguide_extension_session ? e({
				...l,
				...t[o]
			}) : e(l);
		});
	});
}
async function d(e) {
	let t = {
		...await u(),
		...e
	};
	return new Promise((e) => {
		chrome.storage.local.set({ [o]: t }, () => {
			e(t);
		});
	});
}
async function f(e) {
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
async function p(e, t) {
	let n = await r(e, t);
	return new Promise((e) => {
		chrome.storage.local.set({ [a]: n }, () => {
			e();
		});
	});
}
function m(e, t) {
	if (!e || typeof e != "object") return t || s;
	let n = (e.first_name || "").trim(), r = (e.middle_name || "").trim(), i = (e.last_name || "").trim(), a = (e.suffix || "").trim();
	if (!n && !i && e.display_name && e.display_name.trim()) {
		let t = e.display_name.trim().split(/\s+/);
		t.length === 1 ? n = t[0] : t.length === 2 ? (n = t[0], i = t[1]) : t.length >= 3 && (n = t[0], r = t.slice(1, -1).join(" "), i = t[t.length - 1]);
	}
	let o = (e.father_first_name || "").trim(), c = (e.father_middle_name || "").trim(), l = (e.father_last_name || "").trim(), u = (e.father_suffix || "").trim(), d = (e.father_name || "").trim();
	if (!o && !l && d) {
		let e = d.split(/\s+/);
		e.length === 1 ? o = e[0] : e.length === 2 ? (o = e[0], l = e[1]) : e.length >= 3 && (o = e[0], c = e.slice(1, -1).join(" "), l = e[e.length - 1]);
	}
	let f = (e.mother_first_name || "").trim(), p = (e.mother_middle_name || "").trim(), m = (e.mother_last_name || e.maiden_name || "").trim(), h = (e.mother_suffix || "").trim(), g = (e.mother_maiden_name || "").trim();
	if (!f && !m && g) {
		let e = g.split(/\s+/);
		e.length === 1 ? f = e[0] : e.length === 2 ? (f = e[0], m = e[1]) : e.length >= 3 && (f = e[0], p = e.slice(1, -1).join(" "), m = e[e.length - 1]);
	}
	let _ = t?.firstName?.trim().toLowerCase() || "", v = t?.lastName?.trim().toLowerCase() || "", y = n.trim().toLowerCase(), b = i.trim().toLowerCase(), x = t?.emailAddress?.trim().toLowerCase() || "", S = (e.email || "").trim().toLowerCase(), C = (t?.philsysId || "").replace(/[-\s]/g, ""), w = (e.philsys_id || e.philsys_card_number || "").replace(/[-\s]/g, ""), T = t && (w && C && w === C || S && x && S === x || y && b && _ === y && v === b) && t ? t : s;
	return {
		firstName: n || T.firstName || "",
		middleName: r || T.middleName || "",
		lastName: i || T.lastName || "",
		suffix: a || T.suffix || "",
		gender: e.gender?.toUpperCase() === "FEMALE" ? "FEMALE" : e.gender?.toUpperCase() === "OTHER" ? "OTHER" : "MALE",
		dateOfBirth: e.birth_date || e.date_of_birth || T.dateOfBirth || "",
		placeOfBirth: e.place_of_birth || (e.city ? `${e.city}, Philippines` : T.placeOfBirth || ""),
		civilStatus: e.civil_status?.toUpperCase() || T.civilStatus || "SINGLE",
		nationality: e.nationality || T.nationality || "FILIPINO",
		fatherFullName: d || [
			o,
			c,
			l,
			u
		].filter(Boolean).join(" ") || T.fatherFullName || "",
		fatherFirstName: o || T.fatherFirstName || "",
		fatherMiddleName: c || T.fatherMiddleName || "",
		fatherLastName: l || T.fatherLastName || "",
		fatherSuffix: u || T.fatherSuffix || "",
		motherMaidenFirstName: f || T.motherMaidenFirstName || "",
		motherMaidenMiddleName: p || T.motherMaidenMiddleName || "",
		motherMaidenLastName: m || T.motherMaidenLastName || "",
		motherMaidenSuffix: h || T.motherMaidenSuffix || "",
		mobileNumber: e.phone || e.mobile || e.mobile_number || e.contact_number || T.mobileNumber || "",
		emailAddress: e.email || T.emailAddress || "",
		landline: e.landline || T.landline || "",
		region: e.region || T.region || "",
		province: e.province || T.province || "",
		cityMunicipality: e.city || T.cityMunicipality || "",
		barangay: e.barangay || T.barangay || "",
		streetHouseNumber: e.street_address || e.residential_address || T.streetHouseNumber || "",
		zipCode: e.zip_code || T.zipCode || "",
		philsysId: e.philsys_id || e.philsys_card_number || T.philsysId || "",
		tin: e.tin || e.tin_number || T.tin || "",
		sssNumber: e.sss_number || T.sssNumber || "",
		philhealthNumber: e.philhealth_number || T.philhealthNumber || "",
		pagibigMid: e.pagibig_number || e.pagibigMid || T.pagibigMid || "",
		passportNumber: e.passport_number || e.passportNumber || T.passportNumber || "",
		relationshipToOwner: e.relationship || T.relationshipToOwner || "Self"
	};
}
async function h(e, t, n) {
	let r = t && t !== "967760de-3912-5aaf-8ce9-48b2a8dd55f0" ? t : "active", i = { "x-extension-id": "govguide-extension" };
	n && (i.Authorization = `Bearer ${n}`);
	let a = [e];
	for (let e of [
		"3000",
		"3001",
		"3002",
		"3003",
		"3010",
		"3011",
		"3100"
	]) {
		let t = `http://localhost:${e}`;
		a.includes(t) || a.push(t);
	}
	let o = null;
	for (let e of a) try {
		let t = await fetch(`${e}/api/citizen/details?citizenId=${encodeURIComponent(r)}`, { headers: i });
		if (!t.ok) {
			o = /* @__PURE__ */ Error(`GovGuide Sync error: ${t.statusText}`);
			continue;
		}
		let n = await t.json();
		if (n.ok && n.applicant) {
			let t = await f(), i = m(n.applicant, t);
			return await p(i), await d({
				lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
				citizenId: n.applicant.id || r,
				apiBaseUrl: e
			}), i;
		}
	} catch (e) {
		o = e instanceof Error ? e : Error(String(e));
	}
	throw o || /* @__PURE__ */ Error("No applicant profile returned from GovGuide");
}
// extension/src/lib/citizen-chat.ts
var g = "govguide_citizen_chat_history";
(/* @__PURE__ */ new Date()).toISOString();
function _(e) {
	let t = e?.trim();
	return !t || t === "active" || t === "e1000000-0000-4000-8000-000000000003" ? null : `${g}_${t}`;
}
async function v(e) {
	return new Promise((t) => {
		try {
			let n = [g], r = _(e);
			r && n.push(r), chrome.storage.local.remove(n, () => t());
		} catch {
			t();
		}
	});
}
// extension/src/background/index.ts
chrome.runtime.onInstalled.addListener(() => {
	y();
});
function y() {
	chrome.contextMenus.removeAll(() => {
		chrome.contextMenus.create({
			id: "govguide_root",
			title: "GovGuide PH",
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
	let n = await f(), r = "";
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
});
function b(e) {
	try {
		chrome.runtime.sendMessage({
			type: "SESSION_UPDATED",
			session: x(e)
		}, () => {
			chrome.runtime.lastError;
		});
	} catch {}
}
function x(e) {
	let { accessToken: t, refreshToken: n, ...r } = e;
	return r;
}
async function S(e, t, n) {
	let r = await d({
		isAuthenticated: !0,
		authSource: n,
		userRole: e.role,
		userId: e.userId,
		email: e.email,
		fullName: e.fullName,
		officerName: e.fullName,
		agencyCode: e.agencyCode,
		agencyName: e.agencyName,
		accessToken: t.accessToken,
		refreshToken: t.refreshToken,
		expiresAt: t.expiresAt
	});
	return b(r), r;
}
async function C() {
	let e = await u();
	await p(s), await v(e.userId || e.citizenId);
	let t = await d({
		isAuthenticated: !1,
		authSource: void 0,
		userRole: "guest",
		userId: void 0,
		citizenId: "active",
		email: void 0,
		fullName: void 0,
		officerName: void 0,
		agencyCode: void 0,
		agencyName: void 0,
		accessToken: void 0,
		refreshToken: void 0,
		expiresAt: void 0
	});
	b(t);
	try {
		chrome.runtime.sendMessage({
			type: "VAULT_UPDATED",
			vault: s
		});
	} catch {}
	return t;
}
async function w(e) {
	if (!e.refreshToken) return null;
	try {
		let t = await fetch(`${e.apiBaseUrl}/api/extension/auth`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken: e.refreshToken })
		}), n = await t.json();
		return !t.ok || !n.success ? null : await S(n.user, n.tokens, e.authSource || "extension");
	} catch {
		return null;
	}
}
async function T(e, t = {}) {
	let n = await u(), r = (e) => {
		let n = {
			"Content-Type": "application/json",
			"x-agency-role": "counter_officer",
			...t.headers || {}
		};
		return e && (n.Authorization = `Bearer ${e}`), n;
	}, i = (r) => fetch(`${n.apiBaseUrl}${e}`, {
		...t,
		headers: r
	}), a = await i(r(n.accessToken));
	if (a.status === 401 && n.refreshToken) {
		let e = await w(n);
		e && e.accessToken && (n = e, a = await i(r(e.accessToken)));
	}
	return a;
}
var E = null;
async function D(e) {
	let t = await u(), n = e.apiBaseUrl || t.apiBaseUrl;
	if (e.signedOut) return t.isAuthenticated && t.authSource === "web" ? { session: x(await C()) } : { session: x(t) };
	if (!e.accessToken) return e.apiBaseUrl && e.apiBaseUrl !== t.apiBaseUrl ? { session: x(await d({ apiBaseUrl: e.apiBaseUrl })) } : { session: x(t) };
	if (t.isAuthenticated && t.accessToken === e.accessToken || E === e.accessToken) return { session: x(t) };
	E = e.accessToken;
	try {
		let r = await fetch(`${n}/api/extension/auth`, { headers: {
			Authorization: `Bearer ${e.accessToken}`,
			"x-extension-id": "govguide-extension"
		} }), i = await r.json();
		return !r.ok || !i.success ? {
			session: x(t),
			error: i.error || "Web session could not be verified"
		} : (e.apiBaseUrl && e.apiBaseUrl !== t.apiBaseUrl && await d({ apiBaseUrl: e.apiBaseUrl }), { session: x(await S(i.user, {
			accessToken: e.accessToken,
			refreshToken: e.refreshToken || ""
		}, "web")) });
	} finally {
		E = null;
	}
}
chrome.runtime.onMessage.addListener((e, t, n) => (O(e).then(n).catch((e) => {
	n({ error: e.message || "Unknown background error" });
}), !0));
async function O(e) {
	switch (e.type) {
		case "GET_VAULT": {
			try {
				let e = await u();
				if (e.isOnlineSyncEnabled) try {
					let t = e.citizenId && e.citizenId !== "967760de-3912-5aaf-8ce9-48b2a8dd55f0" ? e.citizenId : "active";
					return { vault: await h(e.apiBaseUrl, t, e.accessToken) };
				} catch {}
			} catch {}
			let e = await f();
			return !e.firstName && !e.lastName && !e.philsysId ? { vault: c } : { vault: e };
		}
		case "SAVE_VAULT":
			await p(e.payload.vault, e.payload.pin);
			try {
				chrome.runtime.sendMessage({
					type: "VAULT_UPDATED",
					vault: e.payload.vault
				});
			} catch {}
			return { success: !0 };
		case "PUSH_VAULT_FROM_WEB": {
			let { applicant: t, citizenId: n, apiBaseUrl: r } = e.payload, i = m(t, await f());
			await p(i);
			let a = n || t?.id || "active", o = await u(), s = !!t?.display_name?.trim() || !!t?.first_name?.trim() || !!t?.email?.trim() || a !== "active" && a !== "e1000000-0000-4000-8000-000000000003", c = t?.role === "agency_admin" ? "agency_admin" : "citizen", l = t?.display_name || [t?.first_name, t?.last_name].filter(Boolean).join(" ") || "Citizen Session", h = {
				citizenId: a,
				lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			r && (h.apiBaseUrl = r);
			let g = o.userId !== a || o.citizenId !== a || o.userRole !== c || s && o.fullName !== l;
			(s || g) && (h.isAuthenticated = !0, h.authSource = "web", h.userRole = c, h.userId = a, h.email = t?.email || o.email || "citizen@govguide.ph", h.fullName = l);
			let _ = await d(h);
			(!o.isAuthenticated && _.isAuthenticated || g) && b(_);
			try {
				chrome.runtime.sendMessage({
					type: "VAULT_UPDATED",
					vault: i
				});
			} catch {}
			return {
				success: !0,
				vault: i
			};
		}
		case "GET_SESSION": return { session: x(await u()) };
		case "SET_SESSION": {
			let { isAuthenticated: t, userRole: n, accessToken: r, refreshToken: i, authSource: a, ...o } = e.payload;
			return { session: x(await d(o)) };
		}
		case "LOGIN": {
			let t = await u(), n = [
				t.apiBaseUrl,
				"http://localhost:3000",
				"http://localhost:3002",
				"http://localhost:3001",
				"http://localhost:3011"
			], r = null, i = t.apiBaseUrl;
			for (let t of n) try {
				if (r = await fetch(`${t}/api/extension/auth`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-extension-id": "govguide-extension"
					},
					body: JSON.stringify({
						email: e.payload.email,
						password: e.payload.password
					})
				}), r.ok) {
					i = t;
					break;
				}
			} catch {}
			if (!r) return {
				success: !1,
				error: "Unable to connect to GovGuide PH. Ensure the web app is running."
			};
			let a = await r.json().catch(() => ({}));
			return !r.ok || !a.success ? {
				success: !1,
				error: a.error || "Invalid email or password."
			} : (t.userId && t.userId !== a.user.userId && await p(s), i !== t.apiBaseUrl && await d({ apiBaseUrl: i }), {
				success: !0,
				session: x(await S(a.user, a.tokens, "extension"))
			});
		}
		case "LOGOUT": return {
			success: !0,
			session: x(await C())
		};
		case "SYNC_WEB_AUTH": return await D(e.payload);
		case "SYNC_FROM_GOVGUIDE": try {
			let t = await u();
			try {
				let e = await chrome.tabs.query({ url: [
					"http://localhost:*/*",
					"http://127.0.0.1:*/*",
					"*://*.govguide.ph/*"
				] });
				for (let n of e) if (n.url && (n.title?.includes("GovGuide") || n.url.includes("/chat") || n.url.includes("/login") || n.url.includes("/agency"))) {
					let e = new URL(n.url);
					e.origin && e.origin !== t.apiBaseUrl && (t.apiBaseUrl = e.origin, await d({ apiBaseUrl: e.origin }));
					break;
				}
			} catch {}
			let n = e.payload?.citizenId || (t.citizenId && t.citizenId !== "967760de-3912-5aaf-8ce9-48b2a8dd55f0" ? t.citizenId : "active"), r = await h(t.apiBaseUrl, n, t.accessToken);
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
		} catch (e) {
			return {
				success: !1,
				error: e.message || "Unable to connect to GovGuide PH. Ensure the web app is running."
			};
		}
		case "FETCH_AGENCY_REQUESTS": try {
			let t = e.payload?.q?.trim() || "", n = await T(`/api/agency/requests${t ? `?q=${encodeURIComponent(t)}` : ""}`), r = await n.json();
			if (!n.ok || !r.success) throw Error(r.error || "Failed to load agency requests");
			return {
				success: !0,
				data: r.data
			};
		} catch (e) {
			return {
				success: !1,
				error: e.message || "Failed to load agency requests",
				data: []
			};
		}
		case "UPDATE_REQUEST_STATUS": try {
			let t = await T("/api/agency/requests", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(e.payload)
			}), n = await t.json();
			if (!t.ok || !n.success) throw Error(n.error || "Failed to update agency request status");
			try {
				chrome.notifications.create({
					type: "basic",
					iconUrl: "icons/icon-128.png",
					title: "GovGuide Agency Bridge",
					message: `${e.payload.requestId} updated: ${n.data?.statusLabel || "Saved"}`
				});
			} catch {}
			return {
				success: !0,
				data: n.data
			};
		} catch (e) {
			return {
				success: !1,
				error: e.message || "Failed to update agency request status"
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
