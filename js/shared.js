/* ============================================================
   SHARED PLUMBING (js/shared.js) — loaded by EVERY page.
   Contains only things all pages need:
   1) the connection to our Supabase database
   2) tiny helper functions (money format, safe text, toasts)
   3) login awareness: who is signed in? (updates the nav)
   4) the cart, stored in this browser (carts are personal)
   Page-SPECIFIC logic stays inside each page's own file.
   ============================================================ */

/* ---- 1) DATABASE CONNECTION (uses keys from js/config.js) ---- */
const sb = supabase.createClient(SB_URL, SB_KEY);

/* ---- 2) SMALL HELPERS ---- */
const $   = id => document.getElementById(id);                       // shortcut: $('x') = the element with id="x"
const rs  = n  => "Rs " + Number(n || 0).toLocaleString("en-PK");     // 1150 -> "Rs 1,150"
const esc = s  => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); // stops typed text breaking the page
const oid    = n => "LZ-" + (1000 + Number(n));                       // order number -> "LZ-1004"
const custId = n => "C-"  + (100  + Number(n));                       // customer number -> "C-104"

function toast(msg){                                                  // the small green popup at the bottom
  const t = $('toast'); if(!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('show'), 2600);
}
function busy(btn, on){                                               // disables a button while the database works
  if(!btn) return;
  btn.disabled = on; btn.dataset.txt ??= btn.textContent;
  btn.textContent = on ? "One moment…" : btn.dataset.txt;
}
function closeModal(id){ $(id)?.classList.remove('open'); }
function showErr(m){                                                  // the red banner: shows the EXACT database error
  const e = $('errBanner'); if(!e) return;
  e.textContent = "Problem talking to the bookshop database: " + m + " — screenshot this and send it to the shopkeeper.";
  e.style.display = 'block';
}

/* ---- 3) LOGIN AWARENESS ----
   Every page calls updateNav() on load. It asks Supabase
   "is someone signed in?", fetches their profile, and turns
   the nav's "Login" link into their name (or "Admin"). */
let ME = null, PROF = null, IS_ADMIN = false;

async function updateNav(){
  const { data:{ session } } = await sb.auth.getSession();
  ME = session?.user || null;
  const link = $('navAuth'); if(!link) return;
  if(ME){
    const { data } = await sb.from('profiles').select('*').eq('id', ME.id).maybeSingle();
    PROF = data; IS_ADMIN = !!data?.is_admin;
    link.textContent = IS_ADMIN ? "Admin" : (PROF?.name?.split(' ')[0] || "Account");
    link.href = IS_ADMIN ? "admin.html" : "orders.html";
  } else {
    PROF = null; IS_ADMIN = false;
    link.textContent = "Login";
    link.href = "account.html";
  }
}
/* Pages that REQUIRE login (checkout, my orders) call this instead: */
async function requireLogin(){
  await updateNav();
  if(!ME) location.href = "account.html?next=" + encodeURIComponent(location.pathname.split('/').pop());
  return !!ME;
}
function logout(){ sb.auth.signOut().then(()=>{ location.href = "index.html"; }); }

/* ---- 4) THE CART (saved in THIS browser via localStorage) ---- */
function getCart(){ try{ return JSON.parse(localStorage.getItem('lz_cart')) || []; }catch(e){ return []; } }
function setCart(c){
  localStorage.setItem('lz_cart', JSON.stringify(c));
  const n = c.reduce((s,l)=>s+l.n,0);
  const el = $('cartCount'); if(el) el.textContent = n;               // updates the little number on the Cart button
}
function cartCountRefresh(){ setCart(getCart()); }
