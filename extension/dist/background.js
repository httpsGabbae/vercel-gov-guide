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
	userRole: "guest",
	isAuthenticated: !1,
	citizenId: "active",
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
	let _ = t || s;
	return {
		firstName: n || _.firstName || "",
		middleName: r || _.middleName || "",
		lastName: i || _.lastName || "",
		suffix: a || _.suffix || "",
		gender: e.gender?.toUpperCase() === "FEMALE" ? "FEMALE" : e.gender?.toUpperCase() === "OTHER" ? "OTHER" : "MALE",
		dateOfBirth: e.birth_date || e.date_of_birth || _.dateOfBirth || "",
		placeOfBirth: e.place_of_birth || (e.city ? `${e.city}, Philippines` : _.placeOfBirth || ""),
		civilStatus: e.civil_status?.toUpperCase() || _.civilStatus || "SINGLE",
		nationality: e.nationality || _.nationality || "FILIPINO",
		fatherFullName: d || [
			o,
			c,
			l,
			u
		].filter(Boolean).join(" ") || _.fatherFullName || "",
		fatherFirstName: o || _.fatherFirstName || "",
		fatherMiddleName: c || _.fatherMiddleName || "",
		fatherLastName: l || _.fatherLastName || "",
		fatherSuffix: u || _.fatherSuffix || "",
		motherMaidenFirstName: f || _.motherMaidenFirstName || "",
		motherMaidenMiddleName: p || _.motherMaidenMiddleName || "",
		motherMaidenLastName: m || _.motherMaidenLastName || "",
		motherMaidenSuffix: h || _.motherMaidenSuffix || "",
		mobileNumber: e.phone || e.mobile || e.mobile_number || e.contact_number || _.mobileNumber || "",
		emailAddress: e.email || _.emailAddress || "",
		landline: e.landline || _.landline || "",
		region: e.region || _.region || "",
		province: e.province || _.province || "",
		cityMunicipality: e.city || _.cityMunicipality || "",
		barangay: e.barangay || _.barangay || "",
		streetHouseNumber: e.street_address || e.residential_address || _.streetHouseNumber || "",
		zipCode: e.zip_code || _.zipCode || "",
		philsysId: e.philsys_id || e.philsys_card_number || _.philsysId || "",
		tin: e.tin || e.tin_number || _.tin || "",
		sssNumber: e.sss_number || _.sssNumber || "",
		philhealthNumber: e.philhealth_number || _.philhealthNumber || "",
		pagibigMid: e.pagibig_number || e.pagibigMid || _.pagibigMid || "",
		passportNumber: e.passport_number || e.passportNumber || _.passportNumber || "",
		relationshipToOwner: e.relationship || _.relationshipToOwner || "Self"
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
});
function g(e) {
	try {
		chrome.runtime.sendMessage({
			type: "SESSION_UPDATED",
			session: _(e)
		}, () => {
			chrome.runtime.lastError;
		});
	} catch {}
}
function _(e) {
	let { accessToken: t, refreshToken: n, ...r } = e;
	return r;
}
async function v(e, t, n) {
	let r = await u({
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
	return g(r), r;
}
async function y() {
	let e = await u({
		isAuthenticated: !1,
		authSource: void 0,
		userRole: "guest",
		userId: void 0,
		email: void 0,
		fullName: void 0,
		officerName: void 0,
		agencyCode: void 0,
		agencyName: void 0,
		accessToken: void 0,
		refreshToken: void 0,
		expiresAt: void 0
	});
	return g(e), e;
}
async function b(e) {
	if (!e.refreshToken) return null;
	try {
		let t = await fetch(`${e.apiBaseUrl}/api/extension/auth`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken: e.refreshToken })
		}), n = await t.json();
		return !t.ok || !n.success ? null : await v(n.user, n.tokens, e.authSource || "extension");
	} catch {
		return null;
	}
}
async function x(e, t = {}) {
	let n = await l(), r = (e) => {
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
		let e = await b(n);
		e && e.accessToken && (n = e, a = await i(r(e.accessToken)));
	}
	return a;
}
var S = null;
async function C(e) {
	let t = await l();
	if (e.signedOut || !e.accessToken) return t.isAuthenticated && t.authSource === "web" && t.accessToken ? { session: _(await y()) } : { session: _(t) };
	if (t.isAuthenticated && t.accessToken === e.accessToken || S === e.accessToken) return { session: _(t) };
	S = e.accessToken;
	try {
		let n = await fetch(`${t.apiBaseUrl}/api/extension/auth`, { headers: { Authorization: `Bearer ${e.accessToken}` } }), r = await n.json();
		return !n.ok || !r.success ? {
			session: _(t),
			error: r.error || "Web session could not be verified"
		} : { session: _(await v(r.user, {
			accessToken: e.accessToken,
			refreshToken: e.refreshToken || ""
		}, "web")) };
	} finally {
		S = null;
	}
}
chrome.runtime.onMessage.addListener((e, t, n) => (w(e).then(n).catch((e) => {
	n({ error: e.message || "Unknown background error" });
}), !0));
async function w(e) {
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
			let { applicant: t, citizenId: n, apiBaseUrl: r } = e.payload, i = p(t, await d());
			await f(i);
			let a = n || t?.id || "active", o = await l(), s = !!t?.display_name?.trim() || !!t?.first_name?.trim() || !!t?.email?.trim() || a !== "active" && a !== "e1000000-0000-4000-8000-000000000003", c = {
				citizenId: a,
				lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			r && (c.apiBaseUrl = r), !o.isAuthenticated && s && (c.isAuthenticated = !0, c.authSource = "web", c.userRole = "citizen", c.userId = a, c.email = t?.email || "citizen@govguide.ph", c.fullName = t?.display_name || [t?.first_name, t?.last_name].filter(Boolean).join(" ") || "Citizen Session");
			let m = await u(c);
			!o.isAuthenticated && m.isAuthenticated && g(m);
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
		case "GET_SESSION": {
			let e = await l();
			if (!e.isAuthenticated && e.isOnlineSyncEnabled) try {
				let t = e.citizenId && e.citizenId !== "967760de-3912-5aaf-8ce9-48b2a8dd55f0" ? e.citizenId : "active", n = await fetch(`${e.apiBaseUrl}/api/citizen/details?citizenId=${encodeURIComponent(t)}`);
				if (n.ok) {
					let r = await n.json(), i = r?.applicant;
					r?.ok && i && (r.source === "active_session_cache" || r.source === "supabase_profile" || i.display_name?.trim() || i.first_name?.trim() || i.email?.trim()) && (await f(p(i, await d())), e = await u({
						isAuthenticated: !0,
						authSource: "web",
						userRole: "citizen",
						userId: i.id || t,
						citizenId: i.id || t,
						email: i.email || "citizen@govguide.ph",
						fullName: i.display_name || [i.first_name, i.last_name].filter(Boolean).join(" ") || "Citizen Session",
						lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
					}));
				}
			} catch {}
			return { session: _(e) };
		}
		case "SET_SESSION": {
			let { isAuthenticated: t, userRole: n, accessToken: r, refreshToken: i, authSource: a, ...o } = e.payload;
			return { session: _(await u(o)) };
		}
		case "LOGIN": {
			let t = await l(), n = await fetch(`${t.apiBaseUrl}/api/extension/auth`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: e.payload.email,
					password: e.payload.password
				})
			}), r = await n.json().catch(() => ({}));
			return !n.ok || !r.success ? {
				success: !1,
				error: r.error || "Invalid email or password."
			} : {
				success: !0,
				session: _(await v(r.user, r.tokens, "extension"))
			};
		}
		case "LOGOUT": return {
			success: !0,
			session: _(await y())
		};
		case "SYNC_WEB_AUTH": return await C(e.payload);
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
		case "FETCH_AGENCY_REQUESTS": try {
			let t = e.payload?.q?.trim() || "", n = await x(`/api/agency/requests${t ? `?q=${encodeURIComponent(t)}` : ""}`), r = await n.json();
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
			let t = await x("/api/agency/requests", {
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
