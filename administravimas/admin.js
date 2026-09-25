// Admin-only section/modal HTML generator functions - loaded ONLY when
// visiting /administravimas, never downloaded by ordinary site visitors.
// Split out of index.html for performance - see loadScript() call at boot.

  function adminSidebarHtml(){
    return `<div class="admin-sidebar-overlay ${mobileSidebarOpen?'open':''}" id="adminSidebarOverlay"></div>
    <div class="admin-sidebar ${mobileSidebarOpen?'open':''}" id="adminSidebar">
      <div class="sidebar-logo-row">
        <img src="/logo.png" alt="Logotipas" class="sidebar-logo">
        <span class="sidebar-title">Užsakymų administravimas</span>
        <button class="sidebar-logout-icon-btn" id="logoutBtn" title="Atsijungti">🔑</button>
        <button class="sidebar-close-btn" id="sidebarCloseBtn">×</button>
      </div>
      <nav class="sidebar-nav" id="sidebarNav">
        ${getOrderedNavItems().map(item=>{
          // Message unread badge, and a "new order" badge for the Užsakymai
          // tab. The orders one deliberately ignores the currently-viewed
          // month/status filter (unlike the on-screen order counts), so a
          // new order for a future month still surfaces here immediately.
          let unreadCount = 0;
          if(item.key==='messages') unreadCount = messages.filter(m=>!m.read).length;
          else if(item.key==='inbox') unreadCount = incomingEmails.filter(e=>!e.read).length;
          else if(item.key==='orders') unreadCount = orders.filter(o=>o.status==='laukia_patvirtinimo').length;
          return `<div class="sidebar-item ${activeAdminTab===item.key?'active':''}" data-admin-tab="${item.key}" draggable="true" data-nav-key="${item.key}"><span class="sidebar-drag-handle">⠿</span><span class="sidebar-item-icon">${item.icon}</span>${item.label}${unreadCount>0 ? `<span class="sidebar-badge">${unreadCount}</span>` : ''}</div>`;
        }).join('')}
      </nav>
      <div class="sidebar-footer">
        ${orderSettings.showFormTestingButtons !== false ? `
        <button class="btn btn-ghost btn-sm sidebar-footer-btn" id="openCustomerFormBtn">📝 Kliento užsakymo forma</button>
        <button class="btn btn-ghost btn-sm sidebar-footer-btn" id="copyFormUrlBtn">🔗 Nukopijuoti formos adresą</button>
        ` : ''}
      </div>
    </div>
    <button type="button" class="admin-fab" id="adminQuickActionsFab" aria-label="Greitieji veiksmai">${adminQuickActionsOpen ? '×' : '+'}</button>
    ${adminQuickActionsOpen ? `<div class="admin-quick-actions-panel" id="adminQuickActionsPanel">
      <button type="button" class="admin-quick-actions-close" id="adminQuickActionsClose" aria-label="Uždaryti">×</button>
      <h3>Greitieji veiksmai</h3>
      <button type="button" class="admin-quick-action-btn" id="manualBtn"><span class="qa-icon">➕</span> Naujas užsakymas</button>
      <button type="button" class="admin-quick-action-btn" id="openAddExpenseBtn"><span class="qa-icon">💳</span> Pridėti išlaidą</button>
    </div>` : ''}`;
  }

  function calendarView(){
    const first = new Date(calYear, calMonth, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    const todayStr = fmtISO(new Date());

    const byDate = {};
    orders.forEach(o=>{
      if(!o.neededDate) return;
      (byDate[o.neededDate] = byDate[o.neededDate] || []).push(o);
    });

    const CAL_DAY_STATUS_COLOR = {
      laukia_patvirtinimo: 'var(--muted-red)',
      aktyvus: 'var(--gold)',
      pagaminta: 'var(--berry)',
      ivykdyta: 'var(--sage-deep)',
    };
    const CAL_DAY_STATUS_PRIORITY = ['laukia_patvirtinimo', 'aktyvus', 'pagaminta', 'ivykdyta'];

    let cells = '';
    for(let i=0;i<startOffset;i++) cells += `<div class="cal-day empty"></div>`;
    for(let d=1; d<=daysInMonth; d++){
      const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayOrders = byDate[dateStr] || [];
      const dominantStatus = CAL_DAY_STATUS_PRIORITY.find(s=>dayOrders.some(o=>o.status===s));
      const cellColor = dominantStatus ? CAL_DAY_STATUS_COLOR[dominantStatus] : '';
      const countBadge = dayOrders.length>1 ? `<span class="cal-order-count">${dayOrders.length}</span>` : '';
      const onVacation = !!vacationRangeFor(dateStr);
      cells += `<div class="cal-day ${dateStr===todayStr?'today':''} ${dateStr===selectedDate?'selected':''} ${onVacation?'cal-day-vacation':''} ${dominantStatus?'has-orders':''}" data-date="${dateStr}" ${cellColor?`style="background:${cellColor};"`:''}>
        <span class="cal-daynum">${d}</span>
        ${countBadge}
      </div>`;
    }

    const selectedOrders = selectedDate ? (byDate[selectedDate]||[]) : [];
    const selectedVacation = selectedDate ? vacationRangeFor(selectedDate) : null;

    return `
      <div class="cal-shrink">
        <div class="cal-head">
          <h3>${capitalizeFirst(MONTH_NAMES[calMonth])} ${calYear}</h3>
          <div class="cal-nav"><button id="calPrev">‹</button><button id="calNext">›</button></div>
        </div>
        <div class="cal-grid">
          ${DOW_NAMES.map(d=>`<div class="cal-dow">${d}</div>`).join('')}
          ${cells}
        </div>
      </div>
      ${selectedDate ? `
      <div class="day-panel">
        <h3>${formatDateLong(selectedDate)}</h3>
        ${selectedVacation ? `<p class="vacation-warning" style="margin-bottom:10px;">🌴 Atostogaujama nuo ${formatDate(selectedVacation.start)} iki ${formatDate(selectedVacation.end)} - šią dieną užsakymų nepriimame.</p>` : ''}
        ${selectedOrders.length===0 ? `<p style="color:var(--choc-soft);font-size:13.5px;margin:0;">Šiai dienai užsakymų nėra.</p>` :
          `<div class="grid">${selectedOrders.map(ticketCard).join('')}</div>`}
      </div>` : ''}
    `;
  }


  function warehouseSectionHtml(){
    const availFlavors = warehouse.flavors.filter(f=>!warehouse.unavailableFlavors.includes(f));
    const unavailFlavors = warehouse.flavors.filter(f=>warehouse.unavailableFlavors.includes(f));
    const availColors = warehouse.colors.filter(c=>!warehouse.unavailableColors.includes(c));
    const unavailColors = warehouse.colors.filter(c=>warehouse.unavailableColors.includes(c));

    const flavorStockRows = availFlavors.length
      ? availFlavors.map((f)=>{
          const i = warehouse.flavors.indexOf(f);
          const stock = (warehouse.flavorStock && typeof warehouse.flavorStock[f]==='number') ? warehouse.flavorStock[f] : '';
          return `<div class="wh-stock-row">
            <span class="chip-name" style="flex:1;">${escapeHtml(f)}</span>
            <div style="display:flex;align-items:center;gap:4px;">
              <input type="number" min="0" step="0.5" class="flavor-stock-input" data-flavor-stock="${escapeAttr(f)}" placeholder="likutis" value="${stock}">
              <span class="chip-actions">
                <button class="chip-eye" data-wtype="flavor" data-wname="${escapeAttr(f)}" title="Pažymėti kaip laikinai neturimą">👁️</button>
                <button class="chip-x" data-wtype="flavor" data-widx="${i}" title="Ištrinti visam laikui">×</button>
              </span>
            </div>
          </div>`;
        }).join('')
      : `<p class="wh-empty">Nėra įvestų skonių</p>`;
    const colorChips = availColors.length
      ? availColors.map((c)=>{
          const i = warehouse.colors.indexOf(c);
          return `<span class="chip"><span class="chip-dot" style="background:${colorNameToHex(c)}"></span><span class="chip-name">${escapeHtml(c)}</span><span class="chip-actions"><button class="chip-eye" data-wtype="color" data-wname="${escapeAttr(c)}" title="Pažymėti kaip laikinai neturimą">👁️</button><button class="chip-x" data-wtype="color" data-widx="${i}" title="Ištrinti visam laikui">×</button></span></span>`;
        }).join('')
      : `<p class="wh-empty">Nėra įvestų spalvų</p>`;

    const unavailFlavorChips = unavailFlavors.length
      ? unavailFlavors.map(f=>`<span class="chip unavailable"><span class="chip-name">${escapeHtml(f)}</span><span class="chip-actions"><button class="chip-eye" data-wtype-restore="flavor" data-wname="${escapeAttr(f)}" title="Vėl turime">👁️</button></span></span>`).join('')
      : `<p class="wh-empty">Visi skoniai turimi</p>`;
    const unavailColorChips = unavailColors.length
      ? unavailColors.map(c=>`<span class="chip unavailable"><span class="chip-dot" style="background:${colorNameToHex(c)}"></span><span class="chip-name">${escapeHtml(c)}</span><span class="chip-actions"><button class="chip-eye" data-wtype-restore="color" data-wname="${escapeAttr(c)}" title="Vėl turime">👁️</button></span></span>`).join('')
      : `<p class="wh-empty">Visos spalvos turimos</p>`;

    return `<div class="sub-section">
      <div style="display:flex;justify-content:flex-start;margin-bottom:10px;">
        <button type="button" class="btn btn-ghost btn-sm" id="copyWhBtn">Kopijuoti skonius ir spalvas</button>
      </div>
      <p class="combo-hint" style="max-width:760px;margin:0 0 16px;">Prie skonio įrašyk turimą likutį (pvz. buteliukų skaičių) - jis automatiškai mažės pagal užsakymus (žr. suvartojimą žemiau). Palikus tuščią, skonis laikomas neribotu.</p>
      <div class="wh-stack">
        <div class="wh-col">
          <h4>Turimi skoniai</h4>
          <div class="wh-stock-row wh-stock-row-narrow" style="border-bottom:none;padding-bottom:0;">
            <label for="whFlavorUsageSmall" style="font-size:12.5px;color:var(--choc-soft);">Kiek skonio reikia mažam tortui</label>
            <input type="number" min="0" step="0.1" id="whFlavorUsageSmall" value="${(typeof warehouse.flavorUsageSmall==='number')?warehouse.flavorUsageSmall:0.5}">
          </div>
          <div class="wh-stock-row wh-stock-row-narrow" style="border-bottom:none;padding-bottom:0;">
            <label for="whFlavorUsageLarge" style="font-size:12.5px;color:var(--choc-soft);">Kiek skonio reikia dideliam tortui</label>
            <input type="number" min="0" step="0.1" id="whFlavorUsageLarge" value="${(typeof warehouse.flavorUsageLarge==='number')?warehouse.flavorUsageLarge:1}">
          </div>
          <div class="wh-stock-row wh-stock-row-narrow" style="border-bottom:none;padding-bottom:0;">
            <label for="whMinFlavorStock" style="font-size:12.5px;color:var(--choc-soft);">Mažiausias leistinas likutis</label>
            <input type="number" min="0" step="0.5" id="whMinFlavorStock" placeholder="-" value="${(warehouse.minFlavorStock===null || warehouse.minFlavorStock===undefined) ? '' : warehouse.minFlavorStock}">
          </div>
          <div class="checkrow" style="margin:2px 0 12px;">
            <input type="checkbox" id="whMinFlavorStockAlertsOn" ${warehouse.minFlavorStockAlertsOn!==false?'checked':''}>
            <label for="whMinFlavorStockAlertsOn" style="margin:0;text-transform:none;font-weight:400;font-size:12.5px;color:var(--choc-soft);">Rodyti pranešimus apie mažus likučius virš kalendoriaus</label>
          </div>
          <div class="wh-add-row wh-add-row-narrow">
            <input type="text" id="whFlavorInput" placeholder="Pvz. šokoladinis">
            <button class="btn btn-primary btn-sm" id="whAddFlavor">+ Pridėti</button>
          </div>
          <div class="flavor-stock-list">${flavorStockRows}</div>
        </div>
        <div class="wh-col">
          <h4>Turimos spalvos</h4>
          <div class="wh-add-row wh-add-row-narrow">
            <input type="text" id="whColorInput" placeholder="Pvz. rožinė">
            <button class="btn btn-primary btn-sm" id="whAddColor">+ Pridėti</button>
          </div>
          <div class="chip-list wh-colors-list">${colorChips}</div>
        </div>
      </div>
      <div class="inner-block wh-col" style="max-width:560px;">
        <h4>Laikinai neturime</h4>
        <div class="wh-grid">
          <div class="wh-col">
            <h4 style="font-size:12.5px;">Skoniai</h4>
            <div class="chip-list">${unavailFlavorChips}</div>
          </div>
          <div class="wh-col">
            <h4 style="font-size:12.5px;">Spalvos</h4>
            <div class="chip-list">${unavailColorChips}</div>
          </div>
        </div>
      </div>
      <div class="inner-block wh-col" style="max-width:560px;">
        <h4>Tara</h4>
        <div class="wh-stock-row"><span>Didelės tortinės</span><input type="number" min="0" id="whLarge" value="${warehouse.packaging.large||0}"></div>
        <div class="wh-stock-row"><span>Mažos tortinės</span><input type="number" min="0" id="whSmall" value="${warehouse.packaging.small||0}"></div>
        <div class="wh-stock-row"><span>Dideli indeliai</span><input type="number" min="0" id="whJarsLarge" value="${warehouse.packaging.jarsLarge||0}"></div>
        <div class="wh-stock-row"><span>Maži indeliai</span><input type="number" min="0" id="whJarsSmall" value="${warehouse.packaging.jarsSmall||0}"></div>
      </div>
    </div>`;
  }


  function pricesSectionHtml(){
    const extrasRows = extrasList.length
      ? extrasList.map(ex=>`<div class="extra-row">
          <div class="extra-row-top">
            <span class="extra-row-name">${escapeHtml(ex.name)}</span>
            <button class="chip-x" data-extra-remove="${ex.id}">×</button>
          </div>
          <div class="extra-row-prices">
            <label class="extra-price-field">
              <span>Mažam</span>
              <div class="price-input-wrap"><input type="number" min="0" step="0.01" class="price-input" data-extra-price="${ex.id}" data-extra-size="small" value="${ex.priceSmall||0}"><span class="price-eur">€</span></div>
            </label>
            <label class="extra-price-field">
              <span>Dideliam</span>
              <div class="price-input-wrap"><input type="number" min="0" step="0.01" class="price-input" data-extra-price="${ex.id}" data-extra-size="large" value="${ex.priceLarge||0}"><span class="price-eur">€</span></div>
            </label>
          </div>
        </div>`).join('')
      : `<p class="wh-empty">Nėra pridėtų priedų</p>`;

    return `<div class="sub-section">
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Produktų kainos</h4>
        ${PRICE_ROWS.map(([key,label])=>`
          <div class="wh-stock-row"><span>${label}</span>
            <div class="price-input-wrap">
              <input type="number" min="0" step="0.01" class="price-input" data-price-key="${key}" value="${prices[key]||0}">
              <span class="price-eur">€</span>
            </div>
          </div>`).join('')}
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Skubus užsakymas</h4>
        <div class="toggle-row" style="margin-bottom:12px;">
          <label class="toggle-switch">
            <input type="checkbox" id="toggleUrgentOrderFeature" ${orderSettings.urgentOrderFeatureOn!==false?'checked':''}>
            <span class="toggle-track"></span>
          </label>
          <div>
            <div style="font-weight:700;font-size:14px;">Leisti klientams patiems užsakyti skubius užsakymus</div>
            <p class="combo-hint" style="margin:2px 0 0;">Įjungus - kai iki pasirinktos datos lieka mažiau nei nustatytas minimalus laikas, klientui kliento formoje parodoma žinutė apie papildomą mokestį ir varnelė sutikimui - pažymėjęs, jis gali užsakymą pateikti pats. Išjungus - tokiu atveju klientui tiesiog parašoma susisiekti dėl skubaus užsakymo per Facebook, ir jis pats užsakymo pateikti negali.</p>
          </div>
        </div>
        <p class="combo-hint" style="margin-bottom:10px;">Papildomas mokestis, pridedamas prie užsakymo kainos, kai jis pažymimas kaip skubus.</p>
        <div class="wh-stock-row"><span>Skubaus užsakymo mokestis</span>
          <div class="price-input-wrap">
            <input type="number" min="0" step="0.01" class="price-input" data-price-key="urgent_fee" value="${prices.urgent_fee||0}">
            <span class="price-eur">€</span>
          </div>
        </div>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Savikaina</h4>
        <p class="combo-hint" style="margin-bottom:10px;">Paspausk ant produkto ir pridėk komponentus (žaliavas, pakuotę ir pan.) su jų kainomis - bendra savikaina susumuojama automatiškai.</p>
        ${COST_ROWS.map(([key,label])=>{
          const total = computeProductCost(key);
          const expanded = costExpandedKey === key;
          const components = costComponents[key] || [];
          return `<div class="cost-accordion">
            <div class="wh-stock-row cost-accordion-head" data-cost-toggle="${key}">
              <span style="display:flex;align-items:center;gap:6px;">${label}<svg class="wh-chevron ${expanded?'open':''}" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
              <span style="font-weight:600;color:var(--berry-deep);">${total.toFixed(2)} €</span>
            </div>
            ${expanded ? `
            <div class="cost-components-panel">
              ${components.length ? components.map(c=>`
                <div class="wh-stock-row">
                  <span>${escapeHtml(c.name)}</span>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span>${(c.price||0).toFixed(2)} €</span>
                    <button class="chip-x" data-cost-comp-remove="${key}|${c.id}">×</button>
                  </div>
                </div>`).join('') : `<p class="wh-empty">Komponentų dar nėra</p>`}
              <div class="wh-add-row" style="flex-wrap:wrap;margin-top:8px;">
                <input type="text" class="cost-comp-name" data-cost-comp-key="${key}" placeholder="Pvz. Cukrus" style="flex:2;min-width:130px;">
                <input type="number" min="0" step="0.01" class="cost-comp-price" data-cost-comp-key="${key}" placeholder="€" style="min-width:70px;flex:1;">
                <button class="btn btn-primary btn-sm" data-cost-comp-add="${key}">+ Pridėti</button>
              </div>
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="inner-block" style="max-width:560px;">
        <div class="checkrow" style="margin-bottom:8px;"><input type="checkbox" id="toggleJarExtrasFeature" ${orderSettings.jarExtrasFeatureOn?'checked':''}><label for="toggleJarExtrasFeature" style="margin:0;text-transform:none;font-weight:700;font-family:'Noto Serif',serif;font-size:14.5px;color:var(--choc);">Indelių priedai</label></div>
        <p class="combo-hint" style="margin-bottom:10px;">Gali nustatyti skirtingą kainą mažam ir dideliam indeliui. Nuėmus varnelę, priedų pasirinkimas dings iš užsakymo formos.</p>
        <div class="field" style="margin-bottom:8px;">
          <input type="text" id="extraNameInput" placeholder="Priedo pavadinimas, pvz. popcornai">
        </div>
        <div class="wh-add-row" style="flex-wrap:wrap;">
          <input type="number" min="0" step="0.01" id="extraPriceSmallInput" placeholder="€ mažam" style="min-width:90px;flex:1;">
          <input type="number" min="0" step="0.01" id="extraPriceLargeInput" placeholder="€ dideliam" style="min-width:90px;flex:1;">
          <button class="btn btn-primary btn-sm" id="addExtraBtn">+ Pridėti</button>
        </div>
        <div>${extrasRows}</div>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <div class="checkrow" style="margin-bottom:8px;"><input type="checkbox" id="toggleCakeDecorFeature" ${orderSettings.cakeDecorFeatureOn?'checked':''}><label for="toggleCakeDecorFeature" style="margin:0;text-transform:none;font-weight:700;font-family:'Noto Serif',serif;font-size:14.5px;color:var(--choc);">Tortų dekoras</label></div>
        <p class="combo-hint" style="margin-bottom:10px;">Tortų dekoro variantai - kaina vienoda mažam ir dideliam tortui. Nuėmus varnelę, dekoro pasirinkimas dings iš užsakymo formos.</p>
        <div class="field" style="margin-bottom:8px;">
          <input type="text" id="decorNameInput" placeholder="Dekoro pavadinimas, pvz. Rožinis dekoras">
        </div>
        <div class="wh-add-row" style="flex-wrap:wrap;">
          <input type="number" min="0" step="0.01" id="decorPriceInput" placeholder="€" style="min-width:90px;flex:1;">
          <button class="btn btn-primary btn-sm" id="addDecorBtn">+ Pridėti</button>
        </div>
        <div>${decorsList.length ? decorsList.map(d=>`<div class="extra-row">
          <div class="extra-row-top">
            <span class="extra-row-name">${escapeHtml(d.name)}</span>
            <button class="chip-x" data-decor-remove="${d.id}">×</button>
          </div>
          <div class="extra-row-prices">
            <label class="extra-price-field">
              <span>Kaina</span>
              <div class="price-input-wrap"><input type="number" min="0" step="0.01" class="price-input" data-decor-price="${d.id}" value="${d.price||0}"><span class="price-eur">€</span></div>
            </label>
          </div>
        </div>`).join('') : `<p class="wh-empty">Nėra pridėtų dekoro variantų</p>`}</div>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Pristatymas</h4>
        <p class="combo-hint" style="margin-bottom:10px;">Nuėmus varnelę, tas pristatymo būdas dings iš užsakymo formos pasirinkimų.</p>
        <div class="wh-stock-row">
          <div class="checkrow" style="margin:0;"><input type="checkbox" id="toggleDeliveryPickup" ${orderSettings.pickupEnabled?'checked':''}><label for="toggleDeliveryPickup" style="margin:0;text-transform:none;font-weight:500;">Atsiimsiu pats</label></div>
        </div>
        ${DELIVERY_PRICE_ROWS.map(([key,label])=>{
          const toggleId = key==='delivery_vilnius' ? 'toggleDeliveryVilnius' : 'toggleDeliveryBus';
          const enabled = key==='delivery_vilnius' ? orderSettings.deliveryVilniusEnabled : orderSettings.deliveryBusEnabled;
          return `
          <div class="wh-stock-row">
            <div class="checkrow" style="margin:0;"><input type="checkbox" id="${toggleId}" data-delivery-toggle="${key}" ${enabled?'checked':''}><label for="${toggleId}" style="margin:0;text-transform:none;font-weight:500;">${label}</label></div>
            <div class="price-input-wrap">
              <input type="number" min="0" step="0.01" class="price-input" data-price-key="${key}" value="${prices[key]||0}">
              <span class="price-eur">€</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }


  function vacationsSectionHtml(){
    const rows = vacations.length
      ? vacations.slice().sort((a,b)=>a.start.localeCompare(b.start)).map(v=>`<div class="wh-stock-row">
          <span>${formatDate(v.start)} – ${formatDate(v.end)}</span>
          <button class="chip-x" data-vacation-remove="${v.id}">×</button>
        </div>`).join('')
      : `<p class="wh-empty">Atostogų nenustatyta</p>`;

    return `<div class="sub-section">
      <p class="combo-hint" style="margin-bottom:10px;">Šiomis dienomis klientai negalės pateikti užsakymo per kliento formą.</p>
      <div class="wh-add-row" style="max-width:560px;">
        <div class="field" style="margin-bottom:0;flex:1;"><label>Nuo</label><input type="date" id="vacationStart"></div>
        <div class="field" style="margin-bottom:0;flex:1;"><label>Iki</label><input type="date" id="vacationEnd"></div>
        <button class="btn btn-primary btn-sm" id="addVacationBtn" style="align-self:flex-end;">+ Pridėti</button>
      </div>
      <div class="inner-block" style="max-width:560px;">${rows}</div>
    </div>`;
  }


  function giftCouponModalHtml(){
    return `<div class="overlay" id="giftCouponModalOverlay">
      <div class="modal" style="max-width:380px;">
        <h2>Kurti dovanų kuponą</h2>
        <div class="field"><label>Suma (€)</label><input type="text" inputmode="decimal" id="giftCouponAmountInput" placeholder="0.00"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="closeGiftCouponModal">Atšaukti</button>
          <button type="button" class="btn btn-primary" id="confirmGiftCouponBtn">Sukurti ir atsisiųsti</button>
        </div>
      </div>
    </div>`;
  }


  function addExpenseModalHtml(){
    const categoryOptions = expenseCategories.map(c=>`<option value="${escapeAttr(c.name)}" ${expenseDraft.category===c.name?'selected':''}>${escapeHtml(c.name)}</option>`).join('');
    const attachmentsHtml = expenseAttachments.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
      ${expenseAttachments.map((a,i)=>`<div style="position:relative;">
        ${a.type==='image'
          ? `<img src="${a.dataUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--box-line);">`
          : `<div style="width:64px;height:64px;border-radius:8px;border:1px solid var(--box-line);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:22px;background:var(--cream);"><span>📄</span><span style="font-size:9px;color:var(--choc-soft);max-width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(a.name||'PDF')}</span></div>`}
        <button type="button" class="chip-x" data-expense-attachment-remove="${i}" style="position:absolute;top:-8px;right:-8px;background:var(--white);border-radius:50%;">×</button>
      </div>`).join('')}
    </div>` : '';
    return `<div class="overlay" id="addExpenseModalOverlay">
      <div class="modal" style="max-width:420px;">
        <h2>Pridėti išlaidą</h2>
        <div class="field"><label>Data</label><input type="date" id="modalExpenseDate" value="${escapeAttr(expenseDraft.date)}"></div>
        <div class="field"><label>Aprašymas</label><input type="text" id="modalExpenseDescription" placeholder="Pvz. Miltai, cukrus" value="${escapeAttr(expenseDraft.description)}"></div>
        <div class="field">
          <label>Kategorija</label>
          <select id="modalExpenseCategory">
            <option value="">-</option>
            ${categoryOptions}
          </select>
        </div>
        <div class="field"><label>Suma (€)</label><input type="text" inputmode="decimal" id="modalExpenseAmount" placeholder="0.00" value="${escapeAttr(expenseDraft.amount)}"></div>
        <div class="field">
          <label>Sąskaitos faktūros serija ir numeris</label>
          <input type="text" id="modalExpenseDocNumber" placeholder="Pvz. AAA 000123" value="${escapeAttr(expenseDraft.docNumber)}">
        </div>
        <div class="field">
          <label>Sąskaita / čekis (nebūtina)</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <label class="btn btn-ghost btn-sm" for="modalExpenseFile" style="cursor:pointer;">📎 Pasirinkti failą(-us)</label>
            <input type="file" id="modalExpenseFile" accept="image/*,application/pdf" multiple style="display:none;">
            ${isMobileDevice() ? `
            <label class="btn btn-ghost btn-sm" for="modalExpenseCamera" style="cursor:pointer;">📷 Fotografuoti</label>
            <input type="file" id="modalExpenseCamera" accept="image/*" capture="environment" style="display:none;">
            ` : ''}
          </div>
          ${expenseAttachments.length > 1 ? `<p class="combo-hint" style="margin-top:6px;">${expenseAttachments.length} failai bus sujungti į vieną PDF.</p>` : ''}
          ${attachmentsHtml}
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="closeAddExpenseModal">Atšaukti</button>
          <button type="button" class="btn btn-primary" id="modalAddExpenseBtn">+ Pridėti išlaidą</button>
        </div>
      </div>
    </div>`;
  }


  function exportModalHtml(){
    const counts = {};
    STATUS_ORDER.forEach(s=>{ counts[s] = orders.filter(o=>o.status===s).length; });
    const totalSelected = orders.filter(o=>exportSelectedStatuses.has(o.status)).length;
    const rows = STATUS_ORDER.map(s=>`<label class="export-row">
      <input type="checkbox" data-export-cat-pick="${s}" ${exportSelectedStatuses.has(s)?'checked':''}>
      <span class="export-row-name">${STATUS_LABELS[s]}</span>
      <span class="export-row-status">${counts[s]} vnt.</span>
    </label>`).join('');
    const allChecked = STATUS_ORDER.every(s=>exportSelectedStatuses.has(s));

    return `<div class="overlay" id="exportModalOverlay">
      <div class="modal export-modal">
        <h2>Eksportuoti užsakymus</h2>
        <p class="combo-hint" style="margin-bottom:10px;">Pasirink, kurių kategorijų užsakymus nori eksportuoti į Excel failą - bus įtraukti visi tų kategorijų užsakymai.</p>
        <div class="checkrow" style="margin-bottom:10px;">
          <input type="checkbox" id="exportSelectAll" ${allChecked?'checked':''}>
          <label for="exportSelectAll" style="margin:0;text-transform:none;font-weight:600;">Pasirinkti visas kategorijas</label>
        </div>
        <div class="export-list">
          ${rows}
        </div>
        <p class="combo-hint" style="margin:10px 0;">Iš viso bus eksportuota: ${totalSelected} užsakymų.</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="closeExportModal">Atšaukti</button>
          <button type="button" class="btn btn-primary" id="confirmExportBtn">Eksportuoti į Excel</button>
        </div>
      </div>
    </div>`;
  }


  function orderProductSummaryPlain(arr, singular, plural){
    if(!arr || !arr.length) return '';
    return arr.map((unit,i)=>{
      const combos = (unit.combos||[]).filter(c=>c.flavor||c.color);
      const txt = combos.length ? combos.map(c=>`${c.color||'?'} - ${c.flavor||'?'}`).join(' | ') : 'nepasirinkta';
      const decor = decorLabelFor(unit);
      return `#${i+1}: ${txt}${decor ? ` (${decor})` : ''}`;
    }).join('; ');
  }


  function buildOrdersExportRows(list){
    return list.map(o=>{
      const jarLargeTxt = (o.jarLargeCombos||[]).filter(c=>c.flavor||c.color).map(c=>`${c.color||'?'} - ${c.flavor||'?'}`).join(' | ');
      const jarSmallTxt = (o.jarSmallCombos||[]).filter(c=>c.flavor||c.color).map(c=>`${c.color||'?'} - ${c.flavor||'?'}`).join(' | ');
      const jarLargeExtrasTxt = formatExtrasLineFor(o.jarLargeExtras, '').replace(/^[^:]*:\s*/,'');
      const jarSmallExtrasTxt = formatExtrasLineFor(o.jarSmallExtras, '').replace(/^[^:]*:\s*/,'');
      return {
        'Užsakymo Nr.': formatOrderNumber(o.orderNumber),
        'Data': o.neededDate ? formatDate(o.neededDate) : '',
        'Klientas': o.customerName || '',
        'Telefonas': o.customerPhone || '',
        'El. paštas': o.customerEmail || '',
        'Būsena': STATUS_LABELS[o.status] || o.status || '',
        'Apmokėta': o.paid ? 'Taip' : 'Ne',
        'Pristatymo būdas': fulfillmentLabel(o.fulfillment) || '',
        'Adresas': o.address || '',
        'Kaina (€)': o.price || '',
        'Dideli tortai': orderProductSummaryPlain(o.largeCakes, 'Didelis tortas', 'Dideli tortai'),
        'Maži tortai': orderProductSummaryPlain(o.smallCakes, 'Mažas tortas', 'Maži tortai'),
        'Dideli indeliai (kiekis)': o.jarQtyLarge || '',
        'Dideli indeliai (deriniai)': jarLargeTxt,
        'Dideli indeliai (priedai)': jarLargeExtrasTxt,
        'Maži indeliai (kiekis)': o.jarQtySmall || '',
        'Maži indeliai (deriniai)': jarSmallTxt,
        'Maži indeliai (priedai)': jarSmallExtrasTxt,
        'Pastabos': o.notes || '',
        'Sukurta': o.createdAt ? formatDate(o.createdAt.slice(0,10)) : '',
      };
    });
  }


  async function exportOrdersToExcel(list){
    const rows = buildOrdersExportRows(list);
    const ws = XLSX.utils.json_to_sheet(rows);
    const colCount = rows.length ? Object.keys(rows[0]).length : 0;
    const lastCol = XLSX.utils.encode_col(Math.max(0, colCount-1));
    ws['!autofilter'] = { ref: `A1:${lastCol}1` };
    ws['!freeze'] = { xSplit: "0", ySplit: "1", topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    ws['!cols'] = Object.keys(rows[0]||{}).map(k=>({ wch: Math.max(12, Math.min(40, k.length+4)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Užsakymai');

    const filename = `uzsakymai_${fmtISO(new Date())}.xlsx`;
    const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    const blob = new Blob([wbout], {type:'application/octet-stream'});

    if(window.showSaveFilePicker){
      try{
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description:'Excel failas', accept: {'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']} }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }catch(e){
        if(e && e.name === 'AbortError') return; // user cancelled the save dialog
        console.error('showSaveFilePicker nepavyko, naudoju įprastą atsisiuntimą', e);
      }
    }
    XLSX.writeFile(wb, filename);
  }

  // VMVT food-safety production register - viewable/editable table + export.
  function foodProductionLogModalHtml(){
    const sorted = [...foodProductionLog].sort((a,b)=> (b.productionDate||'').localeCompare(a.productionDate||''));
    const rows = sorted.map(entry=>`<tr>
      <td><input type="date" data-fpl-field="productionDate" data-fpl-id="${entry.id}" value="${entry.productionDate||''}"></td>
      <td><input type="text" data-fpl-field="productName" data-fpl-id="${entry.id}" value="${escapeAttr(entry.productName||'')}" style="min-width:140px;"></td>
      <td><input type="number" min="0" data-fpl-field="weightGrams" data-fpl-id="${entry.id}" value="${entry.weightGrams||0}" style="width:90px;"></td>
      <td><input type="date" data-fpl-field="servedDate" data-fpl-id="${entry.id}" value="${entry.servedDate||''}"></td>
      <td><button type="button" class="chip-x" data-fpl-remove="${entry.id}" title="Pašalinti">×</button></td>
    </tr>`).join('');
    return `<div class="overlay" id="foodProductionLogModalOverlay">
      <div class="modal" style="max-width:900px;">
        <h2>Duomenų apie pagamintą maistą registravimas</h2>
        <p class="combo-hint" style="margin-bottom:14px;">Įrašai kuriami automatiškai, kai užsakymo būsena pakeičiama į „Paruošta atsiėmimui" (gamybos data) ir „Užbaigta" (patiekimo data). Gali koreguoti bet kurį lauką ir išsaugoti.</p>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13.5px;">
            <thead><tr style="text-align:left;">
              <th style="padding:6px 8px;">Gamybos data</th>
              <th style="padding:6px 8px;">Pavadinimas</th>
              <th style="padding:6px 8px;">Kiekis (g)</th>
              <th style="padding:6px 8px;">Patiekimo data</th>
              <th style="padding:6px 8px;"></th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="5" class="wh-empty" style="padding:12px 8px;">Įrašų dar nėra.</td></tr>`}</tbody>
          </table>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="closeFoodProductionLogModal">Uždaryti</button>
          <button type="button" class="btn btn-ghost" id="exportFoodProductionLogBtn">Eksportuoti į Excel</button>
          <button type="button" class="btn btn-primary" id="saveFoodProductionLogBtn">Išsaugoti pakeitimus</button>
        </div>
      </div>
    </div>`;
  }

  async function exportFoodProductionLogToExcel(){
    const sorted = [...foodProductionLog].sort((a,b)=> (a.productionDate||'').localeCompare(b.productionDate||''));
    const rows = sorted.map(e=>({
      'Maisto pagaminimo data': e.productionDate ? formatDate(e.productionDate) : '',
      'Pagaminto maisto pavadinimas': e.productName || '',
      'Pagaminto maisto kiekis per dieną': e.weightGrams ? `${e.weightGrams} g` : '',
      'Pagaminto maisto patiekimo galutiniams vartotojams data': e.servedDate ? formatDate(e.servedDate) : '',
      'Atsakingo asmens parašas': '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:20},{wch:28},{wch:24},{wch:36},{wch:22}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maisto gamyba');
    const filename = `pagaminto_maisto_registras_${fmtISO(new Date())}.xlsx`;
    const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    const blob = new Blob([wbout], {type:'application/octet-stream'});
    if(window.showSaveFilePicker){
      try{
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description:'Excel failas', accept: {'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']} }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }catch(e){
        if(e && e.name === 'AbortError') return;
        console.error('showSaveFilePicker nepavyko, naudoju įprastą atsisiuntimą', e);
      }
    }
    XLSX.writeFile(wb, filename);
  }

  // Builds the official VMI-style "Gyventojo individualios veiklos pajamų
  // ir išlaidų apskaitos žurnalas" for the currently selected journal period,
  // matching the layout of the reference template exactly (title rows,
  // merged header, numbered columns 1–8, and totals at the bottom).
  const HAIR_BORDER = {style:'hair'};
  const FULL_BORDER = {top:HAIR_BORDER, bottom:HAIR_BORDER, left:HAIR_BORDER, right:HAIR_BORDER};


  async function exportIncomeExpenseJournalToExcel(){
    const {start, end} = getJournalDateRange();
    const entries = [
      ...invoices.filter(inv=>inv.issueDate && inv.issueDate>=start && inv.issueDate<=end)
        .map(inv=>({
          type:'income', date: inv.issueDate,
          docText: `${formatDate(inv.issueDate)} sąskaita faktūra ${formatInvoiceNumber(inv)}`,
          content: 'Cukraus vatos skanėstai',
          amount: inv.totalAmount || 0,
        })),
      ...expenses.filter(ex=>ex.date && ex.date>=start && ex.date<=end)
        .map(ex=>({
          type:'expense', date: ex.date,
          docText: ex.docNumber
            ? `${formatDate(ex.date)} sąskaita faktūra Nr. ${ex.docNumber}`
            : `${formatDate(ex.date)} ${ex.category ? ex.category+' ' : ''}kvitas`,
          content: ex.description || '-',
          amount: ex.amount || 0,
        })),
    ].sort((a,b)=> a.date.localeCompare(b.date));

    const startYear = (start||'').slice(0,4);
    const endYear = (end||'').slice(0,4);
    const sheetName = (startYear && startYear===endYear) ? startYear : 'Žurnalas';

    const sellerLine = orderSettings.sellerName
      ? `${orderSettings.sellerName}${sellerCode ? ', ' + sellerCode : ''}`
      : 'Vardas Pavardė (gyventojo vardas, pavardė, asmens kodas)';
    const businessLine = 'Saldu puru - cukraus vatos skanėstai';

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = [
      {width:5}, {width:11}, {width:28}, {width:22}, {width:12}, {width:16}, {width:12}, {width:12},
    ];

    // Row 1 - title
    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = 'Gyventojo individualios veiklos pajamų ir išlaidų apskaitos žurnalas';
    sheet.getCell('A1').font = {name:'Arial', size:10, bold:true};
    sheet.getCell('A1').alignment = {horizontal:'center', vertical:'center'};

    // Row 2 - seller name
    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = sellerLine;
    sheet.getCell('A2').font = {name:'Arial', size:10};
    sheet.getCell('A2').alignment = {horizontal:'center', vertical:'center'};

    // Row 3 - business name
    sheet.mergeCells('A3:H3');
    sheet.getCell('A3').value = businessLine;
    sheet.getCell('A3').font = {name:'Arial', size:10};
    sheet.getCell('A3').alignment = {horizontal:'center', vertical:'center'};

    // Rows 4–5 - column headers
    const headerCells = ['A4','B4','C4','D4','E4','F4','G4','H4','F5','G5','H5'];
    sheet.mergeCells('A4:A5');
    sheet.mergeCells('B4:B5');
    sheet.mergeCells('C4:C5');
    sheet.mergeCells('D4:D5');
    sheet.mergeCells('E4:E5');
    sheet.mergeCells('F4:H4');
    sheet.getCell('A4').value = 'Eilės numeris';
    sheet.getCell('B4').value = 'Data';
    sheet.getCell('C4').value = 'Dokumento data, pavadinimas ir numeris';
    sheet.getCell('D4').value = 'Operacijos turinys';
    sheet.getCell('E4').value = 'Pajamų suma (eurais)';
    sheet.getCell('F4').value = 'Išlaidos ir (arba) leidžiami atskaitymai, susiję su individualios veiklos pajamų gavimu arba uždirbimu';
    sheet.getCell('F5').value = 'Prekių, medžiagų, žaliavų, detalių įsigijimo';
    headerCells.forEach(coord=>{
      const cell = sheet.getCell(coord);
      cell.font = {name:'Times New Roman', size:8, bold:true};
      cell.alignment = {horizontal:'center', vertical:'center', wrapText:true};
      cell.border = FULL_BORDER;
    });

    // Row 6 - reference column numbers 1–8
    for(let c=1;c<=8;c++){
      const cell = sheet.getCell(6, c);
      cell.value = c;
      cell.font = {name:'Arial', size:10, bold:true};
      cell.alignment = {horizontal:'center', vertical:'center'};
      cell.border = FULL_BORDER;
    }

    // Data rows
    let totalIncome = 0, totalExpense = 0;
    let r = 7;
    entries.forEach((e,i)=>{
      const row = sheet.getRow(r);
      row.getCell(1).value = i+1;
      // Build the date at UTC midnight (not local midnight) - Excel/ExcelJS
      // reads the date's UTC calendar fields, so a local-time construction in
      // a timezone ahead of UTC (like Lithuania) would roll back to the
      // previous day once written into the file.
      const [dY, dM, dD] = e.date.split('-').map(Number);
      row.getCell(2).value = new Date(Date.UTC(dY, dM-1, dD));
      row.getCell(2).numFmt = 'yyyy-mm-dd';
      row.getCell(3).value = e.docText;
      row.getCell(4).value = e.content;
      if(e.type==='income'){
        row.getCell(5).value = Math.round(e.amount*100)/100;
        totalIncome += e.amount;
      } else {
        row.getCell(6).value = Math.round(e.amount*100)/100;
        totalExpense += e.amount;
      }
      for(let c=1;c<=8;c++){
        const cell = row.getCell(c);
        cell.font = {name:'Arial', size:10};
        cell.border = FULL_BORDER;
        cell.alignment = {vertical:'top', wrapText: c===3 || c===4};
        if(c===5 || c===6 || c===7 || c===8) cell.numFmt = '#,##0.00';
      }
      r++;
    });

    const totalIncomeRounded = Math.round(totalIncome*100)/100;
    const totalExpenseRounded = Math.round(totalExpense*100)/100;
    const profitRounded = Math.round((totalIncome-totalExpense)*100)/100;

    // Totals rows
    const totalsRowDefs = [
      {label:'Viso pajamų:', values:{5:totalIncomeRounded}, labelSize:8, labelItalic:true},
      {label:'Viso išlaidų:', values:{4:totalExpenseRounded, 6:totalExpenseRounded, 7:0, 8:0}, labelSize:8, labelItalic:true},
      {label:'Viso pelnas (nuostolis):', values:{4:profitRounded}, labelSize:10, labelItalic:true, valueSize:12},
    ];
    totalsRowDefs.forEach(def=>{
      const row = sheet.getRow(r);
      sheet.mergeCells(`A${r}:C${r}`);
      row.getCell(1).value = def.label;
      row.getCell(1).font = {name:'Arial', size:def.labelSize, bold:true, italic:def.labelItalic};
      row.getCell(1).alignment = {horizontal:'right', vertical:'center'};
      for(let c=1;c<=8;c++){
        const cell = row.getCell(c);
        cell.border = FULL_BORDER;
        if(!cell.font) cell.font = {name:'Arial', size:def.valueSize||10, bold:true};
      }
      Object.entries(def.values).forEach(([col,val])=>{
        const cell = row.getCell(parseInt(col,10));
        cell.value = val;
        cell.numFmt = '#,##0.00';
        cell.font = {name:'Arial', size:def.valueSize||10, bold:true};
      });
      r++;
    });

    const filename = `pajamu_islaidu_zurnalas_${sheetName}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});

    if(window.showSaveFilePicker){
      try{
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description:'Excel failas', accept: {'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']} }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }catch(e){
        if(e && e.name === 'AbortError') return;
        console.error('showSaveFilePicker nepavyko, naudoju įprastą atsisiuntimą', e);
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  }



  function journalSectionHtml(){
    const {start: journalStart, end: journalEnd} = getJournalDateRange();
    let journalEntries = [
      ...invoices.filter(inv=>inv.issueDate && inv.issueDate>=journalStart && inv.issueDate<=journalEnd).map(inv=>({type:'income', date:inv.issueDate, label:`SF ${formatInvoiceNumber(inv)} - ${inv.buyerName||'-'}`, amount:inv.totalAmount, ref:inv})),
      ...expenses.filter(ex=>ex.date && ex.date>=journalStart && ex.date<=journalEnd).map(ex=>({type:'expense', date:ex.date, label:`${ex.description||'-'} (${ex.category||'be kategorijos'})`, amount:ex.amount||0, ref:ex})),
    ].sort((a,b)=> b.date.localeCompare(a.date));
    if(journalFilterType==='income') journalEntries = journalEntries.filter(e=>e.type==='income');
    if(journalFilterType==='expense') journalEntries = journalEntries.filter(e=>e.type==='expense');

    const journalRows = journalEntries.length
      ? journalEntries.map(e=>`<div class="wh-stock-row">
          <span>${formatDate(e.date)} · ${e.type==='income'?'<span style="color:var(--sage-deep);font-weight:600;">Pajamos</span>':'<span style="color:var(--muted-red);font-weight:600;">Išlaidos</span>'} · ${escapeHtml(e.label)}${e.type==='income' ? ` <button type="button" data-invoice-preview="${e.ref.id}" style="background:none;border:none;cursor:pointer;color:var(--berry);font-size:14px;padding:0;" title="Peržiūrėti neatsisiuntus">📎</button>` : ''}${e.type==='expense' && e.ref.attachmentDataUrl ? ` <button type="button" data-attachment-open="${e.ref.id}" style="background:none;border:none;cursor:pointer;color:var(--berry);font-size:14px;padding:0;">📎</button><button type="button" data-attachment-remove="${e.ref.id}" title="Pašalinti prisegtą failą" style="background:none;border:none;cursor:pointer;color:var(--muted-red);font-size:11px;padding:0;margin-left:2px;vertical-align:2px;">✕</button>` : ''}${e.type==='expense' && !e.ref.attachmentDataUrl ? ` <label for="expenseAttachAdd_${e.ref.id}" class="attach-add-btn" title="Prisegti sąskaitą ar čekį">+</label><input type="file" id="expenseAttachAdd_${e.ref.id}" data-expense-attach="${e.ref.id}" accept="image/*,application/pdf" style="display:none;">` : ''}</span>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-weight:600;color:${e.type==='income'?'var(--sage-deep)':'var(--muted-red)'};">${e.type==='income'?'+':'-'}${e.amount.toFixed(2)} €</span>
            ${e.type==='income'
              ? `<button class="btn btn-ghost btn-sm" data-invoice-download="${e.ref.id}">PDF</button><button class="chip-x" data-invoice-remove="${e.ref.id}" title="Ištrinti sąskaitą">×</button>`
              : `<button class="btn btn-ghost btn-sm" data-expense-pdf="${e.ref.id}">PDF</button><button class="chip-x" data-expense-remove="${e.ref.id}" title="Ištrinti išlaidą">×</button>`}
          </div>
        </div>`).join('')
      : `<p class="wh-empty">Įrašų nerasta pagal pasirinktus filtrus</p>`;

    return `<div class="sub-section">
      <div class="inner-block" style="max-width:640px;">
        <h4 class="section-h4">Pajamų-išlaidų žurnalas</h4>
        <div class="row2" style="margin-top:4px;">
          <div class="field"><label>Nuo</label><input type="date" id="journalFilterStartInput" value="${journalFilterStart}"></div>
          <div class="field"><label>Iki</label><input type="date" id="journalFilterEndInput" value="${journalFilterEnd}"></div>
        </div>
        <div class="field" style="max-width:220px;">
          <label>Rodyti</label>
          <select id="journalFilterTypeSelect">
            <option value="all" ${journalFilterType==='all'?'selected':''}>Visi įrašai</option>
            <option value="income" ${journalFilterType==='income'?'selected':''}>Tik pajamos</option>
            <option value="expense" ${journalFilterType==='expense'?'selected':''}>Tik išlaidos</option>
          </select>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="openJournalAddExpenseBtn" style="margin-bottom:14px;">+ Pridėti išlaidą</button>
        <button type="button" class="btn btn-primary btn-sm" id="openManualInvoiceBtn" style="margin-bottom:14px;margin-left:8px;">🧾 Išrašyti sąskaitą faktūrą</button>
        <button type="button" class="btn btn-primary btn-sm" id="downloadFullReportBtn" style="margin-bottom:14px;">⬇ Atsisiųsti pilną ataskaitą (PDF)</button>
        <button type="button" class="btn btn-ghost btn-sm" id="downloadJournalExcelBtn" style="margin-bottom:14px;margin-left:8px;">⬇ Atsisiųsti pajamų-išlaidų žurnalą (Excel)</button>
        <div>${journalRows}</div>
      </div>
      ${manualInvoiceModalOpen ? manualInvoiceModalHtml() : ''}
    </div>`;
  }


  function invoicesSectionHtml(){
    const categoryRows = expenseCategories.length
      ? expenseCategories.map(c=>`<div class="wh-stock-row"><span>${escapeHtml(c.name)}</span><button class="chip-x" data-expense-cat-remove="${c.id}">×</button></div>`).join('')
      : `<p class="wh-empty">Kategorijų dar nėra</p>`;

    return `<div class="sub-section">
      <div class="inner-block" style="max-width:560px;">
        <button type="button" class="btn btn-ghost btn-sm" id="openExportBtn">Eksportuoti užsakymus (Excel)</button>
        <button type="button" class="btn btn-ghost btn-sm" id="openFoodProductionLogBtn">Duomenų apie pagamintą maistą registravimas</button>
      </div>

      ${(()=>{
        const years = new Set([taxCalcYear]);
        invoices.forEach(i=>{ if(i.issueDate) years.add(Number(i.issueDate.slice(0,4))); });
        expenses.forEach(e=>{ if(e.date) years.add(Number(e.date.slice(0,4))); });
        const yearOptions = Array.from(years).sort((a,b)=>b-a)
          .map(y=>`<option value="${y}" ${y===taxCalcYear?'selected':''}>${y}</option>`).join('');
        const t = computeIndividualVeiklaTax(taxCalcYear, taxCalc30PercentMode, taxCalcIncludeSodra);
        return `<div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Preliminarūs mokesčiai</h4>
        <p class="combo-hint" style="margin-bottom:10px;">Apytikslis GPM ir „Sodros" (VSD+PSD) įmokų skaičiavimas pagal 2026 m. individualios veiklos mokesčių tvarką Lietuvoje. <strong>Tai NĖRA tikslus buhalterinis skaičiavimas</strong> - neatsižvelgia į tavo kitas pajamas (pvz. darbo užmokestį), NPD, vaiko mokesčio kreditą ar Sodros įmokų minimumus/maksimumus. Prieš mokant, pasitikrink su buhalteriu ar VMI.</p>
        <div class="field"><label>Metai</label><select id="taxYearSelect">${yearOptions}</select></div>
        <div class="checkrow">
          <input type="checkbox" id="tax30PercentChk" ${taxCalc30PercentMode?'checked':''}>
          <label for="tax30PercentChk" style="margin:0;text-transform:none;font-weight:500;">Taikyti 30% norminius (neįrodytus) išlaidų atskaitymus vietoj faktinių žurnalo išlaidų</label>
        </div>
        <div class="checkrow" style="margin-top:6px;">
          <input type="checkbox" id="taxSodraChk" ${taxCalcIncludeSodra?'checked':''}>
          <label for="taxSodraChk" style="margin:0;text-transform:none;font-weight:500;">Įskaičiuoti VSD+PSD („Sodra") įmokas (19,5% nuo 90% apmokestinamų pajamų)</label>
        </div>
        <div style="background:var(--cream);border-radius:10px;padding:14px 16px;margin-top:14px;font-size:14px;line-height:1.8;">
          <div style="display:flex;justify-content:space-between;"><span>Pajamos (${taxCalcYear} m.)</span><strong>${t.income.toFixed(2)} €</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>Išlaidos${taxCalc30PercentMode?' (30% norma)':' (faktinės)'}</span><strong>${t.expenses.toFixed(2)} €</strong></div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid var(--box-line);margin-top:6px;padding-top:6px;"><span>Apmokestinamos pajamos (MIVAP)</span><strong>${t.mivap.toFixed(2)} €</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>GPM (gyventojų pajamų mokestis)</span><strong>${t.gpm.toFixed(2)} €</strong></div>
          ${taxCalcIncludeSodra ? `<div style="display:flex;justify-content:space-between;"><span>VSD+PSD („Sodra")</span><strong>${t.sodra.toFixed(2)} €</strong></div>` : ''}
          <div style="display:flex;justify-content:space-between;border-top:1px solid var(--berry);margin-top:6px;padding-top:6px;color:var(--berry);font-size:15.5px;"><span>Iš viso preliminarūs mokesčiai</span><strong>${t.total.toFixed(2)} €</strong></div>
        </div>
        ${t.overLimit ? `<p class="combo-hint" style="margin-top:10px;color:var(--berry);">⚠️ Apmokestinamos pajamos viršija 42 500 €. GPM lentelėje parodytas tik iki šios ribos (kai mokesčio kreditas = 0). Viršijanti dalis (${t.overLimitAmount.toFixed(2)} €) kartu su visomis kitomis tavo metinėmis pajamomis (pvz. darbo užmokesčiu) apmokestinama bendra progresine 20/25/32% GPM skale - tai negali būti tiksliai apskaičiuota vien pagal šios sistemos duomenis. Būtinai pasitikrink su buhalteriu.</p>` : ''}
      </div>`;
      })()}

      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Svoris (gramais)</h4>
        <p class="combo-hint" style="margin-bottom:10px;">Naudojama automatiškai apskaičiuoti pagaminto maisto kiekį gramais VMVT registro žurnale.</p>
        <div class="field"><label>Didelis tortas</label><input type="number" min="0" id="setWeightLargeCake" placeholder="Pvz. 2500" value="${orderSettings.weightLargeCake||''}"></div>
        <div class="field"><label>Mažas tortas</label><input type="number" min="0" id="setWeightSmallCake" placeholder="Pvz. 1200" value="${orderSettings.weightSmallCake||''}"></div>
        <div class="field"><label>Didelis indelis</label><input type="number" min="0" id="setWeightLargeJar" placeholder="Pvz. 300" value="${orderSettings.weightLargeJar||''}"></div>
        <div class="field"><label>Mažas indelis</label><input type="number" min="0" id="setWeightSmallJar" placeholder="Pvz. 150" value="${orderSettings.weightSmallJar||''}"></div>
        <button class="btn btn-primary btn-sm" id="saveWeightsBtn">Išsaugoti</button>
      </div>

      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Išlaidų kategorijos</h4>
        <div class="wh-add-row">
          <input type="text" id="expenseCatNameInput" placeholder="Pvz. Žaliavos" style="flex:1;">
          <button class="btn btn-primary btn-sm" id="addExpenseCatBtn">+ Pridėti</button>
        </div>
        <div>${categoryRows}</div>
      </div>

      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Sąskaitų duomenys (pardavėjas)</h4>
          <div class="field"><label>Vardas pavardė</label><input type="text" id="setSellerName" placeholder="Pvz. Romas Petraitis" value="${escapeAttr(orderSettings.sellerName||'')}"></div>
          <div class="field">
            <label>Asmens kodas</label>
            <input type="text" id="setSellerCode" placeholder="Pvz. 49211031316" value="${escapeAttr(sellerCode||'')}">
            <p class="combo-hint" style="margin-top:4px;">Naudojama tik pajamų-išlaidų žurnalo Excel eksporte. Saugoma atskirai, prieinama tik prisijungus administratoriui - niekada nesiunčiama į kliento užsakymo formą.</p>
          </div>
          <div class="field"><label>Ind. Veiklos kodas</label><input type="text" id="setSellerActivityCode" placeholder="Pvz. 3714312" value="${escapeAttr(orderSettings.sellerActivityCode||'')}"></div>
          <div class="field"><label>Adresas</label><input type="text" id="setSellerAddress" placeholder="Pvz. Veiklūnų g. 11-1, Vilnius" value="${escapeAttr(orderSettings.sellerAddress||'')}"></div>
          <div class="field"><label>Banko informacija</label><input type="text" id="setSellerBankInfo" placeholder="Pvz. LT71 7044 023 2111 4711, AB SEB bankas" value="${escapeAttr(orderSettings.sellerBankInfo||orderSettings.sellerIban||orderSettings.sellerBank||'')}"></div>
          <div class="field"><label>Kontaktinis telefonas (rodomas klientams patvirtinimo laiške)</label><input type="text" id="setSellerContactPhone" placeholder="Pvz. +370 6XX XXXXX" value="${escapeAttr(orderSettings.sellerContactPhone||'')}"></div>
          <div class="field">
            <label>Sąskaitų faktūrų serijos numeris</label>
            <input type="text" id="setInvoiceSeries" placeholder="Pvz. SP" value="${escapeAttr(orderSettings.invoiceSeries||'SP')}">
            <p class="combo-hint" style="margin-top:4px;">Naudojama tik naujai išrašomoms sąskaitoms - jau išrašytos sąskaitos ir žurnalo įrašai išlieka su ta serija, su kuria buvo išrašyti.</p>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="saveSellerInfoBtn">Išsaugoti</button>
      </div>
    </div>`;
  }


  function statsSectionHtml(){
    return `<div class="sub-section">
      <div style="display:flex;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:14px;">
        <div class="year-switcher">
          <button type="button" class="btn btn-sm ${cardsMode==='month'?'btn-primary':'btn-ghost'}" id="cardsModeMonth">Mėnuo</button>
          <button type="button" class="btn btn-sm ${cardsMode==='year'?'btn-primary':'btn-ghost'}" id="cardsModeYear">Metai</button>
        </div>
        <div class="year-switcher">
          <button type="button" class="btn btn-ghost btn-sm" id="cardsPeriodPrev">←</button>
          <span class="year-switcher-label">${cardsMode==='year' ? cardsYear : `${MONTH_SHORT[cardsMonth]} ${cardsYear}`}</span>
          <button type="button" class="btn btn-ghost btn-sm" id="cardsPeriodNext">→</button>
        </div>
      </div>
      <div class="stats-cards">
        <div class="stats-card"><span class="stats-card-label">Iš viso pajamų</span><span class="stats-card-value stats-income" id="statsTotalIncome">-</span></div>
        <div class="stats-card"><span class="stats-card-label">Iš viso išlaidų</span><span class="stats-card-value stats-expense" id="statsTotalExpenses">-</span></div>
        <div class="stats-card"><span class="stats-card-label">Vidutinis užsakymas</span><span class="stats-card-value" id="statsAvgOrder">-</span></div>
        <div class="stats-card"><span class="stats-card-label">Pelnas</span><span class="stats-card-value" id="statsProfit">-</span></div>
      </div>
      <div class="inner-block" style="margin-top:20px;max-width:560px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:14px;">
          <h4 class="section-h4" style="margin:0;">Mėnesio pajamos ir išlaidos</h4>
          <div class="year-switcher">
            <button type="button" class="btn btn-ghost btn-sm" id="statsYearPrev">←</button>
            <span class="year-switcher-label">${statsYear}</span>
            <button type="button" class="btn btn-ghost btn-sm" id="statsYearNext">→</button>
          </div>
        </div>
        <div class="stats-chart-wrap"><canvas id="incomeChart"></canvas></div>
      </div>
      <div class="inner-block" style="margin-top:24px;max-width:560px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:14px;">
          <h4 class="section-h4" style="margin:0;">Užsakymai</h4>
          <div class="year-switcher">
            <button type="button" class="btn btn-ghost btn-sm" id="ordersCountYearPrev">←</button>
            <span class="year-switcher-label">${statsYear}</span>
            <button type="button" class="btn btn-ghost btn-sm" id="ordersCountYearNext">→</button>
          </div>
        </div>
        <div class="stats-chart-wrap"><canvas id="ordersCountChart"></canvas></div>
      </div>
      <div class="inner-block" style="margin-top:24px;max-width:560px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:14px;">
          <h4 class="section-h4" style="margin:0;">Populiariausi produktai</h4>
          <div class="year-switcher">
            <button type="button" class="btn btn-sm ${productsMode==='month'?'btn-primary':'btn-ghost'}" id="productsModeMonth">Mėnuo</button>
            <button type="button" class="btn btn-sm ${productsMode==='year'?'btn-primary':'btn-ghost'}" id="productsModeYear">Metai</button>
          </div>
          <div class="year-switcher">
            <button type="button" class="btn btn-ghost btn-sm" id="productsPeriodPrev">←</button>
            <span class="year-switcher-label">${productsMode==='year' ? productsYear : `${MONTH_SHORT[productsMonth]} ${productsYear}`}</span>
            <button type="button" class="btn btn-ghost btn-sm" id="productsPeriodNext">→</button>
          </div>
        </div>
        <div class="stats-chart-wrap"><canvas id="productsChart"></canvas></div>
      </div>
    </div>`;
  }

  const VAULT_TYPES = {
    link: {icon:'🔗', label:'Nuoroda'},
    document: {icon:'📄', label:'Dokumentas'},
    note: {icon:'📝', label:'Įrašas'},
    image: {icon:'🖼️', label:'Paveikslėlis'},
    contact: {icon:'👤', label:'Kontaktas'},
    reminder: {icon:'📅', label:'Svarbi data'},
    credential: {icon:'🔑', label:'Prisijungimas'},
  };
  const VAULT_TYPE_ORDER = ['link','document','note','image','contact','reminder','credential'];


  function emptyManualInvoiceDraft(){
    return {
      buyerName: '', buyerCode: '', buyerVat: '', buyerAddress: '',
      lineItems: [{description:'', qty:1, unitPrice:0}],
    };
  }


  function manualInvoiceModalHtml(){
    const d = manualInvoiceDraft;
    const total = d.lineItems.reduce((s,it)=> s + (parseFloat(it.qty)||0)*(parseFloat(it.unitPrice)||0), 0);
    return `<div class="overlay" id="manualInvoiceModalOverlay">
      <div class="modal" style="max-width:520px;">
        <h2>Išrašyti sąskaitą faktūrą</h2>
        <p class="combo-hint" style="margin-bottom:10px;">Naudok, kai sąskaitą reikia išrašyti be susieto užsakymo (pvz. laisva prekė ar paslauga). Automatiškai gaus eilinį sąskaitos numerį ir atsiras Pajamų-išlaidų žurnale.</p>
        <div class="field"><label>Pirkėjo vardas / įmonės pavadinimas</label><input type="text" id="mi_buyerName" value="${escapeAttr(d.buyerName)}"></div>
        <div class="row2">
          <div class="field"><label>Įmonės kodas (nebūtina)</label><input type="text" id="mi_buyerCode" value="${escapeAttr(d.buyerCode)}"></div>
          <div class="field"><label>PVM kodas (nebūtina)</label><input type="text" id="mi_buyerVat" value="${escapeAttr(d.buyerVat)}"></div>
        </div>
        <div class="field"><label>Adresas (nebūtina)</label><input type="text" id="mi_buyerAddress" value="${escapeAttr(d.buyerAddress)}"></div>
        <h4 class="section-h4" style="margin-top:16px;">Prekės / paslaugos</h4>
        <div id="manualInvoiceLineItems">
          ${d.lineItems.map((it,i)=>`<div class="row2" style="align-items:flex-end;margin-bottom:8px;" data-mi-line="${i}">
            <div class="field" style="flex:2;"><label>Pavadinimas</label><input type="text" data-mi-desc="${i}" value="${escapeAttr(it.description)}"></div>
            <div class="field" style="max-width:70px;"><label>Kiekis</label><input type="number" min="0" step="1" data-mi-qty="${i}" value="${it.qty}"></div>
            <div class="field" style="max-width:100px;"><label>Kaina (€)</label><input type="number" min="0" step="0.01" data-mi-price="${i}" value="${it.unitPrice}"></div>
            <button type="button" class="chip-x" data-mi-remove-line="${i}" style="margin-bottom:10px;">×</button>
          </div>`).join('')}
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="mi_addLineBtn" style="margin-bottom:12px;">+ Pridėti eilutę</button>
        <p style="font-weight:700;font-size:15px;margin:0 0 14px;">Iš viso: ${total.toFixed(2)} €</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="manualInvoiceModalCancel">Atšaukti</button>
          <button type="button" class="btn btn-primary" id="manualInvoiceModalSave">Išrašyti</button>
        </div>
      </div>
    </div>`;
  }


  function emptyOfferDraft(){
    return {
      id: null, name: '', largeCakes: 0, smallCakes: 0, jarLarge: 0, jarSmall: 0,
      price: 0, visible: true, usageType: 'multiple', used: false, expiresAt: '',
    };
  }

  // Lithuanian "time remaining" string for an offer's expiresAt (a
  // datetime-local value). Returns null once expired.

  function offerModalHtml(){
    const d = offerDraft;
    const isNew = !d.id;
    return `<div class="overlay" id="offerModalOverlay">
      <div class="modal" style="max-width:440px;">
        <h2>${isNew ? 'Naujas pasiūlymas' : 'Redaguoti pasiūlymą'}</h2>
        <div class="field"><label>Pavadinimas</label><input type="text" id="of_name" placeholder="Pvz. Gimtadienis" value="${escapeAttr(d.name)}"></div>
        <div class="row2">
          <div class="field"><label>Didelių tortų kiekis</label><input type="number" min="0" id="of_largeCakes" value="${d.largeCakes||0}"></div>
          <div class="field"><label>Mažų tortų kiekis</label><input type="number" min="0" id="of_smallCakes" value="${d.smallCakes||0}"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Didelių indelių kiekis</label><input type="number" min="0" id="of_jarLarge" value="${d.jarLarge||0}"></div>
          <div class="field"><label>Mažų indelių kiekis</label><input type="number" min="0" id="of_jarSmall" value="${d.jarSmall||0}"></div>
        </div>
        <div class="field"><label>Kaina (€)</label><input type="number" min="0" step="0.01" id="of_price" value="${d.price||0}"></div>
        <div class="field"><label>Naudojimas</label>
          <select id="of_usageType">
            <option value="multiple" ${d.usageType!=='once'?'selected':''}>Daugkartinis (gali naudoti keli klientai)</option>
            <option value="once" ${d.usageType==='once'?'selected':''}>Vienkartinis (dings po pirmo panaudojimo)</option>
          </select>
        </div>
        <div class="field"><label>Galiojimo pabaiga (nebūtina)</label><input type="datetime-local" id="of_expiresAt" value="${d.expiresAt||''}"></div>
        <p class="combo-hint">Palik tuščią, jei pasiūlymas galioja neribotą laiką - tada kliento formoje jokio laikmačio nesimatys.</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="offerModalCancel">Atšaukti</button>
          <button type="button" class="btn btn-primary" id="offerModalSave">Išsaugoti</button>
        </div>
      </div>
    </div>`;
  }


  function emptyVaultDraft(type){
    return {
      id: null, type: type || 'link', description: '',
      url: '', noteText: '',
      fileDataUrl: '', fileName: '',
      contactName: '', contactPhone: '', contactEmail: '', contactNotes: '',
      reminderDate: '', reminderText: '',
      credUsername: '', credPassword: '', credSite: '',
      createdAt: new Date().toISOString(),
    };
  }


  function emptyReviewDraft(){
    return { id: null, name: '', rating: 5, text: '', createdAt: new Date().toISOString() };
  }

  // Small "font size (px) + save" control rendered next to a Puslapis text
  // field. Saved separately from the main "Išsaugoti" button so adjusting
  // size doesn't require re-typing/re-saving all the other text fields.

  function fontSizeControlHtml(key){
    const size = (orderSettings.landingFontSizes && orderSettings.landingFontSizes[key]) || '';
    return `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
      <input type="number" id="fontSize_${key}" placeholder="dydis (px)" value="${size}" min="10" max="120" style="width:84px;padding:6px 8px;border:1px solid var(--box-line);border-radius:8px;font-size:12.5px;">
      <button type="button" class="btn btn-ghost btn-sm" data-save-font-size="${key}" style="padding:5px 10px;font-size:11.5px;">💾 Šrifto dydis</button>
    </div>`;
  }


  function landingPageCollapsibleHtml(key, title, contentHtml){
    const isOpen = !!landingPageOpenSections[key];
    return `<div class="inner-block" style="max-width:560px;">
      <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" data-page-section-toggle="${key}">
        <h4 class="section-h4" style="margin:0;">${title}</h4>
        <span style="font-size:22px;line-height:1;color:var(--berry);">${isOpen ? '−' : '+'}</span>
      </div>
      ${isOpen ? `<div style="margin-top:14px;">${contentHtml}</div>` : ''}
    </div>`;
  }

  function pageSectionHtml(){
    const heroContent = `
        <p class="combo-hint" style="margin-bottom:14px;">Šis tekstas ir nuotraukos rodomi saldupuru.lt pagrindiniame (viešame) puslapyje.</p>
        <div class="field"><label>Mažas ženkliukas virš antraštės (nebūtina)</label><input type="text" id="setLandingHeroLabel" placeholder="Pvz. ✨ Namų dirbtuvė Vilniuje" value="${escapeAttr(orderSettings.landingHeroLabel||'')}">${fontSizeControlHtml('heroLabel')}</div>
        <div class="field"><label>Antraštė</label><input type="text" id="setLandingHeroTitle" placeholder="Pvz. Saldūs prisiminimai prasideda čia" value="${escapeAttr(orderSettings.landingHeroTitle||'')}">${fontSizeControlHtml('heroTitle')}</div>
        <div class="field"><label>Paantraštė</label><textarea id="setLandingHeroSubtitle" rows="2" placeholder="Trumpas sakinys po antrašte">${escapeHtml(orderSettings.landingHeroSubtitle||'')}</textarea>${fontSizeControlHtml('heroSubtitle')}</div>
        <div class="field"><label>Trumpas šūkis po mygtuku (nebūtina)</label><input type="text" id="setLandingHeroTagline" placeholder="Pvz. Pagaminta su meile Lietuvoje ♡" value="${escapeAttr(orderSettings.landingHeroTagline||'')}">${fontSizeControlHtml('heroTagline')}</div>`;

    const aboutContent = `
        <div class="field"><label>Antraštė (nebūtina)</label><input type="text" id="setLandingAboutTitle" placeholder="Pvz. Maži skanėstai. Didelė šventės nuotaika." value="${escapeAttr(orderSettings.landingAboutTitle||'')}">${fontSizeControlHtml('aboutTitle')}</div>
        <div class="field"><label>Tekstas</label><textarea id="setLandingAboutText" rows="4" placeholder="Trumpas pristatymas">${escapeHtml(orderSettings.landingAboutText||'')}</textarea>${fontSizeControlHtml('aboutText')}</div>`;

    const whyTitleContent = `
        <div class="field"><label>Antraštė</label><input type="text" id="setLandingWhyUsTitle" placeholder="Pvz. Ką sako mūsų klientai" value="${escapeAttr(orderSettings.landingWhyUsTitle||'')}">${fontSizeControlHtml('whyUsTitle')}</div>`;

    const reviewsContent = `
        <p class="combo-hint" style="margin-bottom:14px;">Įrašyk realių klientų atsiliepimus - vardą, komentarą ir įvertinimą žvaigždutėmis. Palik tuščią vardą ir tekstą, kad tas atsiliepimas nebūtų rodomas.</p>
        <div class="field"><label>1 kliento vardas</label><input type="text" id="setLandingWhy1Title" placeholder="Pvz. Rūta K." value="${escapeAttr(orderSettings.landingWhy1Title||'')}">${fontSizeControlHtml('why1Title')}</div>
        <div class="field"><label>1 atsiliepimo tekstas</label><textarea id="setLandingWhy1Text" rows="2" placeholder="Pvz. Puikūs skanėstai, vaikai buvo sužavėti!">${escapeHtml(orderSettings.landingWhy1Text||'')}</textarea>${fontSizeControlHtml('why1Text')}</div>
        <div class="field"><label>1 įvertinimas</label><select id="setLandingWhy1Rating">${[5,4,3,2,1].map(n=>`<option value="${n}" ${(orderSettings.landingWhy1Rating||5)==n?'selected':''}>${'★'.repeat(n)}${'☆'.repeat(5-n)}</option>`).join('')}</select></div>

        <div class="field" style="margin-top:14px;"><label>2 kliento vardas</label><input type="text" id="setLandingWhy2Title" placeholder="Pvz. Mindaugas J." value="${escapeAttr(orderSettings.landingWhy2Title||'')}">${fontSizeControlHtml('why2Title')}</div>
        <div class="field"><label>2 atsiliepimo tekstas</label><textarea id="setLandingWhy2Text" rows="2" placeholder="Pvz. Greitas ir malonus bendravimas.">${escapeHtml(orderSettings.landingWhy2Text||'')}</textarea>${fontSizeControlHtml('why2Text')}</div>
        <div class="field"><label>2 įvertinimas</label><select id="setLandingWhy2Rating">${[5,4,3,2,1].map(n=>`<option value="${n}" ${(orderSettings.landingWhy2Rating||5)==n?'selected':''}>${'★'.repeat(n)}${'☆'.repeat(5-n)}</option>`).join('')}</select></div>

        <div class="field" style="margin-top:14px;"><label>3 kliento vardas</label><input type="text" id="setLandingWhy3Title" placeholder="Pvz. Eglė P." value="${escapeAttr(orderSettings.landingWhy3Title||'')}">${fontSizeControlHtml('why3Title')}</div>
        <div class="field"><label>3 atsiliepimo tekstas</label><textarea id="setLandingWhy3Text" rows="2" placeholder="Pvz. Cukraus vata buvo šventės akcentas.">${escapeHtml(orderSettings.landingWhy3Text||'')}</textarea>${fontSizeControlHtml('why3Text')}</div>
        <div class="field"><label>3 įvertinimas</label><select id="setLandingWhy3Rating">${[5,4,3,2,1].map(n=>`<option value="${n}" ${(orderSettings.landingWhy3Rating||5)==n?'selected':''}>${'★'.repeat(n)}${'☆'.repeat(5-n)}</option>`).join('')}</select></div>

        <div class="field" style="margin-top:14px;"><label>4 kliento vardas</label><input type="text" id="setLandingWhy4Title" placeholder="Pvz. Tomas ir Gabija" value="${escapeAttr(orderSettings.landingWhy4Title||'')}">${fontSizeControlHtml('why4Title')}</div>
        <div class="field"><label>4 atsiliepimo tekstas</label><textarea id="setLandingWhy4Text" rows="2" placeholder="Pvz. Nuostabus skonis ir gražus pateikimas.">${escapeHtml(orderSettings.landingWhy4Text||'')}</textarea>${fontSizeControlHtml('why4Text')}</div>
        <div class="field"><label>4 įvertinimas</label><select id="setLandingWhy4Rating">${[5,4,3,2,1].map(n=>`<option value="${n}" ${(orderSettings.landingWhy4Rating||5)==n?'selected':''}>${'★'.repeat(n)}${'☆'.repeat(5-n)}</option>`).join('')}</select></div>`;

    const galleryTitleContent = `
        <div class="field"><label>Antraštė</label><input type="text" id="setLandingGalleryTitle" placeholder="Pvz. Jūsų švenčių akimirkos" value="${escapeAttr(orderSettings.landingGalleryTitle||'')}">${fontSizeControlHtml('galleryTitle')}</div>
        <div class="field"><label>Paantraštė (nebūtina)</label><input type="text" id="setLandingGallerySubtitle" placeholder="Pvz. Spalvingi skanėstai, kurie tampa gražia šventės dalimi." value="${escapeAttr(orderSettings.landingGallerySubtitle||'')}">${fontSizeControlHtml('gallerySubtitle')}</div>`;

    const faqContent = `
          <p class="combo-hint" style="margin:0 0 14px;">Šie klausimai ir atsakymai rodomi viešame puslapyje, tarp galerijos ir kontaktų formos. Jei sąrašas tuščias, ši skiltis viešame puslapyje visai nerodoma.</p>
          ${landingFaqList.map((item,i)=>`<div class="inner-block" style="background:var(--cream);margin-top:0;margin-bottom:10px;">
            <div class="field"><label>Klausimas</label><input type="text" data-faq-q="${i}" value="${escapeAttr(item.q)}"></div>
            <div class="field"><label>Atsakymas</label><textarea rows="3" data-faq-a="${i}">${escapeHtml(item.a)}</textarea></div>
            <button type="button" class="btn btn-ghost btn-sm" data-faq-remove="${i}">× Pašalinti šį klausimą</button>
          </div>`).join('')}
          <button type="button" class="btn btn-primary btn-sm" id="addFaqBtn">+ Pridėti klausimą</button>`;

    const footerContent = `
        <div class="field"><label>Rekvizitai</label><textarea id="setLandingFooterText" rows="3" placeholder="Pvz. Saldu Puru, individuali veikla Nr. ..., adresas...">${escapeHtml(orderSettings.landingFooterText||'')}</textarea>${fontSizeControlHtml('footerText')}</div>
        <div class="field"><label>Facebook nuoroda (nebūtina)</label><input type="text" id="setLandingFacebookUrl" placeholder="https://facebook.com/..." value="${escapeAttr(orderSettings.landingFacebookUrl||'')}"></div>
        <div class="field"><label>Instagram nuoroda (nebūtina)</label><input type="text" id="setLandingInstagramUrl" placeholder="https://instagram.com/..." value="${escapeAttr(orderSettings.landingInstagramUrl||'')}"></div>`;

    const photosContent = `
        <div class="field">
          <label>Pridėti nuotrauką</label>
          <input type="file" id="addLandingGalleryPhoto" accept="image/*">
          <p class="combo-hint" style="margin-top:4px;margin-bottom:10px;">Naudojama hero, „Apie mus" ir galerijos sekcijose. Pridėk kiek nori - kliento galima slinkti į šoną.</p>
          ${(orderSettings.landingGalleryPhotos||[]).length ? `<p class="combo-hint" style="margin-bottom:8px;">Paspausk ant nuotraukos, kad ją padarytum <b>pagrindine</b> (rodoma šalia antraštės teksto). Pažymėta žvaigždute - dabartinė pagrindinė. Nuotraukas gali pertempti pele, kad pakeistum jų eiliškumą.</p>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:10px;" id="galleryPhotosDragList">
            ${(orderSettings.landingGalleryPhotos||[]).map((src,i)=>{
              const isMain = i === (orderSettings.landingHeroPhotoIndex||0);
              return `
              <div style="position:relative;cursor:grab;" draggable="true" data-gallery-photo-drag="${i}">
                <img src="${src}" data-set-hero-photo="${i}" style="width:74px;height:74px;object-fit:cover;border-radius:10px;cursor:pointer;border:2px solid ${isMain?'var(--berry)':'var(--box-line)'};">
                ${isMain ? `<span title="Pagrindinė nuotrauka" style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:var(--berry);color:#fff;border-radius:999px;font-size:10px;padding:1px 6px;">★</span>` : ''}
                <button type="button" class="chip-x" data-remove-gallery-photo="${i}" title="Pašalinti" style="position:absolute;top:-6px;right:-6px;background:var(--white);border-radius:50%;box-shadow:var(--shadow-xs);">×</button>
              </div>`;
            }).join('') || `<p class="wh-empty" style="margin:0;">Nuotraukų dar nėra.</p>`}
          </div>
        </div>`;

    const productsIntroContent = `
        <div class="field"><label>Skilties antraštė</label><input type="text" id="setLandingProductsTitle" value="${escapeAttr(orderSettings.landingProductsTitle||'')}" placeholder="Pvz. Mūsų produktai"></div>
        <div class="field"><label>Paantraštė (nebūtina)</label><input type="text" id="setLandingProductsSubtitle" value="${escapeAttr(orderSettings.landingProductsSubtitle||'')}" placeholder="Trumpas sakinys po antrašte"></div>
        ${landingPageCollapsibleHtml('productsCakes', '🎂 Tortai', productTypeContent('cakes'))}
        ${landingPageCollapsibleHtml('productsJars', '🍬 Indeliai', productTypeContent('jars'))}`;

    return `<div class="sub-section">
      ${landingPageCollapsibleHtml('hero', 'Hero (pirmas ekranas)', heroContent)}
      ${landingPageCollapsibleHtml('about', 'Trumpas pristatymas (Apie mus)', aboutContent)}
      ${landingPageCollapsibleHtml('whyTitle', 'Klientų atsiliepimų antraštė', whyTitleContent)}
      ${landingPageCollapsibleHtml('reviews', 'Klientų atsiliepimai (4 kortelės)', reviewsContent)}
      ${landingPageCollapsibleHtml('galleryTitle', 'Galerijos antraštė', galleryTitleContent)}
      ${landingPageCollapsibleHtml('faq', '❓ DUK (dažniausiai užduodami klausimai)', faqContent)}
      ${landingPageCollapsibleHtml('footer', 'Puslapio apačia (footer)', footerContent)}
      ${landingPageCollapsibleHtml('photos', 'Nuotraukų galerija', photosContent)}
      ${landingPageCollapsibleHtml('products', '🛍️ Mūsų produktai', productsIntroContent)}

      <div class="inner-block" style="max-width:560px;">
        <button class="btn btn-primary btn-sm" id="saveLandingPageBtn">Išsaugoti</button>
      </div>
    </div>`;
  }


  // Photo upload/remove UI + description field for one product type (cakes
  // or jars), used inside the Puslapis tab's "Produktai: Tortai"/"Produktai:
  // Indeliai" collapsibles above. Photos/description live in their own
  // productPages storage key (not orderSettings) - the same base64 photos
  // that made the old landingGalleryPhotos worth watching for Firestore's
  // 1MB-per-document limit would have pushed orderSettings over that limit
  // even faster once product photos were added on top of everything else
  // already in there, so they get their own document/budget instead. Price
  // is no longer entered here - it's read straight from the Kainos tab
  // (small size = "nuo", large size = "iki"), so there's only ever one
  // place to update a price.
  function productTypeContent(type){
    const key = type==='cakes' ? 'cakes' : 'jars';
    const data = (productPages && productPages[key]) || {photos:[], description:''};
    const photos = data.photos || [];
    const prefix = type==='cakes' ? 'Cakes' : 'Jars';
    const priceRange = type==='cakes'
      ? formatPriceRangeText(prices.small_cake, prices.large_cake)
      : formatPriceRangeText(prices.small_jar, prices.large_jar);
    return `
        <p class="combo-hint" style="margin-bottom:10px;">Kaina rodoma automatiškai iš <b>Kainos</b> skilties (mažo dydžio kaina = "nuo", didelio = "iki")${priceRange ? ` - dabar: <b>${escapeHtml(priceRange)}</b>` : ' - kainos dar nenustatytos'}.</p>
        <div class="field">
          <label>Pridėti nuotrauką</label>
          <input type="file" id="addProduct${prefix}Photo" accept="image/*">
          ${photos.length ? `<p class="combo-hint" style="margin-top:4px;margin-bottom:10px;">Pirma nuotrauka rodoma kortelėje pagrindiniame puslapyje. Nuotraukas gali pertempti pele, kad pakeistum jų eiliškumą.</p>` : `<p class="combo-hint" style="margin-top:4px;margin-bottom:10px;">Pirma nuotrauka bus rodoma kortelėje pagrindiniame puslapyje, visos - produkto puslapyje.</p>`}
          <div style="display:flex;flex-wrap:wrap;gap:10px;">
            ${photos.length ? photos.map((src,i)=>`
              <div style="position:relative;cursor:grab;" draggable="true" data-product-photo-drag="${type}:${i}">
                <img src="${src}" style="width:74px;height:74px;object-fit:cover;border-radius:10px;border:2px solid ${i===0?'var(--berry)':'var(--box-line)'};">
                ${i===0 ? `<span title="Pirma - rodoma kortelėje" style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:var(--berry);color:#fff;border-radius:999px;font-size:10px;padding:1px 6px;">★</span>` : ''}
                <button type="button" class="chip-x" data-remove-product-photo="${type}:${i}" title="Pašalinti" style="position:absolute;top:-6px;right:-6px;background:var(--white);border-radius:50%;box-shadow:var(--shadow-xs);">×</button>
              </div>`).join('') : `<p class="wh-empty" style="margin:0;">Nuotraukų dar nėra.</p>`}
          </div>
        </div>
        <div class="field" style="margin-top:14px;"><label>Aprašymas</label><textarea id="setProduct${prefix}Desc" rows="5" placeholder="Aprašymas, rodomas produkto puslapyje šalia nuotraukų">${escapeHtml(data.description||'')}</textarea></div>`;
  }


  function messagesSectionHtml(){
    const sorted = [...messages].sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
    const rows = sorted.length
      ? sorted.map(m=>`<div class="message-card${!m.read ? ' unread' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;cursor:pointer;" data-message-toggle="${m.id}">
            <div>
              <div style="font-weight:700;font-size:14.5px;">${escapeHtml(m.name||'Be vardo')}${!m.read ? ' <span class="sidebar-badge" style="margin-left:6px;">Nauja</span>' : ''}</div>
              <div style="font-size:12.5px;color:var(--choc-soft);">${m.createdAt ? formatDate(m.createdAt.slice(0,10)) : ''}</div>
            </div>
            <button type="button" class="chip-x" data-message-remove="${m.id}" title="Ištrinti žinutę">×</button>
          </div>
          ${openMessageId===m.id ? `
          <div style="margin-top:8px;">
            ${m.email ? `<p class="combo-hint" style="margin:2px 0;">✉️ <a href="mailto:${escapeAttr(m.email)}" style="color:var(--berry-deep);">${escapeHtml(m.email)}</a></p>` : ''}
            ${m.phone ? `<p class="combo-hint" style="margin:2px 0 10px;">📞 <a href="tel:${escapeAttr(m.phone)}" style="color:var(--berry-deep);">${escapeHtml(m.phone)}</a></p>` : ''}
            <p style="font-size:14px;line-height:1.6;white-space:pre-line;margin:0 0 12px;border-top:1px solid var(--box-line);padding-top:10px;">${escapeHtml(m.message||'')}</p>
            ${messageReplyBlockHtml(m)}
          </div>` : ''}
        </div>`).join('')
      : `<div class="inner-block" style="max-width:560px;"><p class="wh-empty">Žinučių dar nėra.</p></div>`;
    return `<div class="sub-section">${rows}</div>`;
  }


  function reviewsSectionHtml(){
    const sorted = reviews.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    return `<div class="sub-section">
      <p class="combo-hint" style="margin-bottom:14px;max-width:560px;">Čia matai visus klientų per puslapį paliktus atsiliepimus (naujausi viršuje). Naujausi 4 automatiškai rodomi viešame puslapyje. Gali redaguoti ar ištrinti bet kurį, arba pridėti atsiliepimą pats.</p>
      <div style="display:flex;justify-content:flex-start;margin-bottom:16px;">
        <button type="button" class="btn btn-primary btn-sm" id="reviewAddBtn">+ Pridėti atsiliepimą</button>
      </div>
      <div class="vault-list">
        ${sorted.length ? sorted.map(reviewCard).join('') : `<p class="wh-empty">Atsiliepimų dar nėra - kai klientas paliks atsiliepimą per puslapį, jis atsiras čia.</p>`}
      </div>
      ${reviewModalOpen ? reviewModalHtml() : ''}
    </div>`;
  }


  function reviewCard(r){
    const rating = Math.max(1, Math.min(5, r.rating||5));
    const dateStr = r.createdAt ? formatDate((r.createdAt||'').slice(0,10)) : '';
    return `<div class="vault-card">
      <div class="vault-card-head">
        <span class="vault-card-icon">⭐</span>
        <div class="vault-card-title">
          <div class="vault-card-type" style="color:var(--gold);letter-spacing:2px;">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div>
          <div class="vault-card-desc">${escapeHtml(r.name || 'Be vardo')}${dateStr ? ` · ${dateStr}` : ''}</div>
        </div>
        <div class="vault-card-actions">
          <button type="button" data-review-edit="${r.id}" title="Redaguoti">✏️</button>
          <button type="button" data-review-remove="${r.id}" title="Ištrinti">🗑️</button>
        </div>
      </div>
      <div class="vault-card-body"><div style="white-space:pre-wrap;">${escapeHtml(r.text||'')}</div></div>
    </div>`;
  }


  function reviewModalHtml(){
    const d = reviewDraft;
    const isNew = !d.id;
    return `<div class="overlay" id="reviewModalOverlay">
      <div class="modal" style="max-width:420px;">
        <h2>${isNew ? 'Naujas atsiliepimas' : 'Redaguoti atsiliepimą'}</h2>
        <div class="field"><label>Kliento vardas</label><input type="text" id="rd_name" value="${escapeAttr(d.name)}" placeholder="Pvz. Rūta K."></div>
        <div class="field"><label>Atsiliepimo tekstas</label><textarea id="rd_text" rows="4" placeholder="Kliento komentaras">${escapeHtml(d.text)}</textarea></div>
        <div class="field"><label>Įvertinimas</label><select id="rd_rating">${[5,4,3,2,1].map(n=>`<option value="${n}" ${(d.rating||5)==n?'selected':''}>${'★'.repeat(n)}${'☆'.repeat(5-n)}</option>`).join('')}</select></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="reviewModalCancel">Atšaukti</button>
          <button type="button" class="btn btn-primary" id="reviewModalSave">Išsaugoti</button>
        </div>
      </div>
    </div>`;
  }


  function vaultSectionHtml(){
    const counts = {};
    VAULT_TYPE_ORDER.forEach(t=>{ counts[t] = vaultItems.filter(v=>v.type===t).length; });
    const filtered = (vaultFilterType ? vaultItems.filter(v=>v.type===vaultFilterType) : vaultItems)
      .slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));

    return `<div class="sub-section">
      <div style="display:flex;justify-content:flex-start;margin-bottom:16px;">
        <button type="button" class="btn btn-primary btn-sm" id="vaultAddBtn">+ Pridėti įrašą</button>
      </div>
      <div class="vault-filter-row">
        <button type="button" class="vault-filter-btn ${!vaultFilterType?'active':''}" data-vault-filter="">Visi (${vaultItems.length})</button>
        ${VAULT_TYPE_ORDER.map(t=>`<button type="button" class="vault-filter-btn ${vaultFilterType===t?'active':''}" data-vault-filter="${t}">${VAULT_TYPES[t].icon} ${VAULT_TYPES[t].label} (${counts[t]||0})</button>`).join('')}
      </div>
      <div class="vault-list">
        ${filtered.length ? filtered.map(vaultItemCard).join('') : `<p class="wh-empty">${vaultFilterType ? 'Šio tipo įrašų dar nėra.' : 'Saugykla dar tuščia - pridėk pirmą įrašą.'}</p>`}
      </div>
      ${vaultModalOpen ? vaultItemModalHtml() : ''}
    </div>`;
  }


  function vaultItemCard(v){
    const meta = VAULT_TYPES[v.type] || {icon:'❔', label:v.type};
    let body = '';
    if(v.type==='link'){
      body = `<a href="${escapeAttr(v.url)}" target="_blank" rel="noopener">${escapeHtml(v.url)}</a>`;
    } else if(v.type==='document'){
      body = v.fileName ? `<span>📎 ${escapeHtml(v.fileName)}</span>` : `<span class="wh-empty">Failas neprisegtas</span>`;
    } else if(v.type==='note'){
      body = `<div style="white-space:pre-wrap;">${escapeHtml(v.noteText||'')}</div>`;
    } else if(v.type==='image'){
      body = v.fileDataUrl ? `<img src="${v.fileDataUrl}" class="vault-card-image-preview" data-vault-image-open="${v.id}">` : `<span class="wh-empty">Nuotrauka neprisegta</span>`;
    } else if(v.type==='contact'){
      body = `
        ${v.contactName ? `<div class="vault-card-row"><span>Vardas:</span><span>${escapeHtml(v.contactName)}</span></div>` : ''}
        ${v.contactPhone ? `<div class="vault-card-row"><span>Tel.:</span><span>${escapeHtml(v.contactPhone)}</span></div>` : ''}
        ${v.contactEmail ? `<div class="vault-card-row"><span>El. paštas:</span><span>${escapeHtml(v.contactEmail)}</span></div>` : ''}
        ${v.contactNotes ? `<div class="vault-card-row"><span>Pastabos:</span><span>${escapeHtml(v.contactNotes)}</span></div>` : ''}`;
    } else if(v.type==='reminder'){
      const isPast = v.reminderDate && v.reminderDate < fmtISO(new Date());
      body = `<div class="vault-card-row"><span>Data:</span><span style="${isPast?'color:var(--muted-red);font-weight:700;':''}">${v.reminderDate ? formatDate(v.reminderDate) : '-'}${isPast?' (praėjo)':''}</span></div>
        ${v.reminderText ? `<div class="vault-card-row"><span>Info:</span><span>${escapeHtml(v.reminderText)}</span></div>` : ''}`;
    } else if(v.type==='credential'){
      body = `
        ${v.credSite ? `<div class="vault-card-row"><span>Svetainė:</span><span>${escapeHtml(v.credSite)}</span></div>` : ''}
        ${v.credUsername ? `<div class="vault-card-row"><span>Naudotojas:</span><span>${escapeHtml(v.credUsername)}</span></div>` : ''}
        <div class="vault-card-row"><span>Slaptažodis:</span><span class="vault-cred-mask" id="vaultCredMask_${v.id}">••••••••</span>
          <button type="button" class="chip-x" data-vault-cred-toggle="${v.id}" title="Rodyti/slėpti" style="color:var(--choc-soft);">👁️</button>
          <button type="button" class="chip-x" data-vault-cred-copy="${v.id}" title="Kopijuoti slaptažodį" style="color:var(--choc-soft);">📋</button>
        </div>`;
    }
    const headActions = `
      ${v.type==='link' ? `<button type="button" data-vault-copy="${v.id}" title="Kopijuoti nuorodą">📋</button><button type="button" data-vault-open="${v.id}" title="Atidaryti">↗️</button>` : ''}
      ${(v.type==='document'||v.type==='image') && v.fileDataUrl ? `<button type="button" data-vault-open="${v.id}" title="Atidaryti failą">↗️</button><button type="button" data-vault-download="${v.id}" title="Atsisiųsti failą">💾</button>` : ''}
      <button type="button" data-vault-edit="${v.id}" title="Redaguoti">✏️</button>
      <button type="button" data-vault-remove="${v.id}" title="Ištrinti">🗑️</button>`;
    return `<div class="vault-card">
      <div class="vault-card-head">
        <span class="vault-card-icon">${meta.icon}</span>
        <div class="vault-card-title">
          <div class="vault-card-type">${meta.label}</div>
          <div class="vault-card-desc">${escapeHtml(v.description || '(be aprašymo)')}</div>
        </div>
        <div class="vault-card-actions">${headActions}</div>
      </div>
      <div class="vault-card-body">${body}</div>
    </div>`;
  }


  function vaultItemModalHtml(){
    const d = vaultDraft;
    const isNew = !d.id;
    return `<div class="overlay" id="vaultModalOverlay">
      <div class="modal" style="max-width:460px;">
        <h2>${isNew ? 'Naujas įrašas' : 'Redaguoti įrašą'}</h2>
        ${isNew ? `<div class="vault-type-picker">
          ${VAULT_TYPE_ORDER.map(t=>`<div class="vault-type-tile ${d.type===t?'selected':''}" data-vault-type-pick="${t}">
            <span class="vault-type-icon">${VAULT_TYPES[t].icon}</span>
            <span class="vault-type-label">${VAULT_TYPES[t].label}</span>
          </div>`).join('')}
        </div>` : `<p class="combo-hint" style="margin-bottom:10px;">${VAULT_TYPES[d.type].icon} ${VAULT_TYPES[d.type].label}</p>`}

        <div class="field"><label>Aprašymas</label><input type="text" id="vd_description" value="${escapeAttr(d.description)}" placeholder="Trumpas pavadinimas"></div>

        ${d.type==='link' ? `<div class="field"><label>Nuoroda (URL)</label><input type="text" id="vd_url" value="${escapeAttr(d.url)}" placeholder="https://..."></div>` : ''}

        ${d.type==='note' ? `<div class="field"><label>Informacija</label><textarea id="vd_note" rows="5">${escapeHtml(d.noteText)}</textarea></div>` : ''}

        ${(d.type==='document'||d.type==='image') ? `<div class="field">
          <label>${d.type==='image'?'Nuotrauka':'Failas'}</label>
          <input type="file" id="vd_file" accept="${d.type==='image'?'image/*':'*/*'}">
          ${d.fileName ? `<p class="combo-hint" style="margin-top:6px;">Dabar prisegta: ${escapeHtml(d.fileName)}</p>` : ''}
        </div>` : ''}

        ${d.type==='contact' ? `
          <div class="field"><label>Vardas</label><input type="text" id="vd_contactName" value="${escapeAttr(d.contactName)}"></div>
          <div class="field"><label>Telefonas</label><input type="text" id="vd_contactPhone" value="${escapeAttr(d.contactPhone)}"></div>
          <div class="field"><label>El. paštas</label><input type="text" id="vd_contactEmail" value="${escapeAttr(d.contactEmail)}"></div>
          <div class="field"><label>Pastabos</label><textarea id="vd_contactNotes" rows="3">${escapeHtml(d.contactNotes)}</textarea></div>
        ` : ''}

        ${d.type==='reminder' ? `
          <div class="field"><label>Data</label><input type="date" id="vd_reminderDate" value="${escapeAttr(d.reminderDate)}"></div>
          <div class="field"><label>Informacija</label><textarea id="vd_reminderText" rows="3">${escapeHtml(d.reminderText)}</textarea></div>
        ` : ''}

        ${d.type==='credential' ? `
          <div class="field"><label>Svetainė / paskyra</label><input type="text" id="vd_credSite" value="${escapeAttr(d.credSite)}"></div>
          <div class="field"><label>Naudotojo vardas</label><input type="text" id="vd_credUsername" value="${escapeAttr(d.credUsername)}"></div>
          <div class="field"><label>Slaptažodis</label><input type="text" id="vd_credPassword" value="${escapeAttr(d.credPassword)}"></div>
          <p class="combo-hint">Šis laukas nešifruojamas - nenaudok itin svarbių (banko) slaptažodžių.</p>
        ` : ''}

        <div class="modal-actions" style="margin-top:16px;">
          <button type="button" class="btn btn-ghost" id="vaultModalCancel">Atšaukti</button>
          <button type="button" class="btn btn-primary" id="vaultModalSave">Išsaugoti</button>
        </div>
      </div>
    </div>`;
  }


  function discountsSectionHtml(){
    const discountRows = discountCodes.length ? discountCodes.map(d=>{
      const usedCount = (d.usedBy||[]).length;
      const isUsersOpen = discountUsersExpandedId === d.id;
      let statusHtml;
      if(d.multiUse){
        statusHtml = `<button type="button" class="discount-status-btn" data-discount-users-toggle="${d.id}">Panaudota ${usedCount} k. ${usedCount ? (isUsersOpen?'▲':'▼') : ''}</button>`;
      } else {
        statusHtml = usedCount
          ? `<span class="discount-used-tag">Panaudota: ${escapeHtml(d.usedBy[0].customerName||'-')}</span>`
          : `<span class="discount-unused-tag">Nepanaudota</span>`;
      }
      const usersListHtml = (d.multiUse && isUsersOpen && usedCount) ? `
        <div class="discount-users-panel">
          ${d.usedBy.map(u=>`<div class="wh-stock-row"><span>${escapeHtml(u.customerName||'-')}</span><span class="combo-hint" style="margin:0;">${u.orderNumber?`Užs. Nr. ${formatOrderNumber(u.orderNumber)}`:''} ${u.usedAt?formatDate(u.usedAt.slice(0,10)):''}</span></div>`).join('')}
        </div>` : '';
      return `<div class="wh-stock-row">
        <span><b>${escapeHtml(d.code)}</b> - ${d.percent}% ${d.multiUse ? '<span class="combo-hint" style="margin:0;">(daugkartinis)</span>' : '<span class="combo-hint" style="margin:0;">(vienkartinis)</span>'}</span>
        <div style="display:flex;align-items:center;gap:10px;">
          ${statusHtml}
          <button class="chip-x" data-discount-remove="${d.id}">×</button>
        </div>
      </div>${usersListHtml}`;
    }).join('') : `<p class="wh-empty">Nuolaidos kodų dar nėra</p>`;

    const couponRows = giftCoupons.length ? giftCoupons.map(g=>`<div class="wh-stock-row">
      <span><b>${escapeHtml(g.code)}</b> - ${g.amount.toFixed(2)} €</span>
      <div style="display:flex;align-items:center;gap:10px;">
        ${g.used
          ? `<span class="discount-used-tag">Panaudota: ${escapeHtml((g.usedBy&&g.usedBy.customerName)||'-')}</span>`
          : `<span class="discount-unused-tag">Nepanaudota</span>`}
        <button type="button" class="btn btn-ghost btn-sm" data-coupon-pdf="${g.id}">PDF</button>
        <button class="chip-x" data-coupon-remove="${g.id}">×</button>
      </div>
    </div>`).join('') : `<p class="wh-empty">Dovanų kuponų dar nėra</p>`;

    const offerRows = offersList.length ? offersList.map(o=>{
      const compositionText = offerCompositionText(o);
      let expiryText = '';
      if(o.expiresAt){
        const remaining = offerRemainingText(o.expiresAt);
        expiryText = `<span style="${remaining?'':'color:var(--berry);font-weight:600;'}">${remaining || 'Pasibaigęs'}</span>`;
      }
      const usageText = o.usageType==='once' ? (o.used ? '<span style="color:var(--berry);font-weight:600;">Panaudotas</span>' : 'Vienkartinis') : 'Daugkartinis';
      return `<div class="offer-admin-card">
        <div class="offer-admin-row1">
          <b>${escapeHtml(o.name)}</b> - ${compositionText} - <b>${(o.price||0).toFixed(2)} €</b>
        </div>
        <div class="offer-admin-row2">
          <label class="offer-admin-visible-label">
            <input type="checkbox" data-offer-visible-toggle="${o.id}" ${o.visible!==false?'checked':''}>
            Rodyti pasiūlymą
          </label>
          <span class="offer-admin-tag">${usageText}</span>
          ${expiryText ? `<span class="offer-admin-tag">${expiryText}</span>` : ''}
          <div class="offer-admin-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-offer-edit="${o.id}">Redaguoti</button>
            <button class="chip-x" data-offer-remove="${o.id}">×</button>
          </div>
        </div>
      </div>`;
    }).join('') : `<p class="wh-empty">Pasiūlymų dar nėra</p>`;

    return `<div class="sub-section">
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">🎁 Pasiūlymai</h4>
        <p class="combo-hint" style="margin-bottom:10px;">Sukurk paketinį pasiūlymą (pvz. „Gimtadienis" = 1 didelis tortas + 10 indelių už fiksuotą kainą). Klientas pasirinks jį kliento formoje virš „Užsakomi produktai" ir turės pasirinkti tik skonius - kiekiai ir kaina užsipildys automatiškai. Varnelė kairėje - ar rodyti kliento formoje.</p>
        <button type="button" class="btn btn-primary btn-sm" id="addOfferBtn" style="margin-bottom:12px;">+ Naujas pasiūlymas</button>
        <div>${offerRows}</div>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Nuolaidos</h4>
        <p class="combo-hint" style="margin-bottom:10px;">Sukurk savo nuolaidos kodą su procentine nuolaida. Vienkartinį kodą klientas galės panaudoti tik kartą.</p>
        <div class="field" style="margin-bottom:8px;">
          <input type="text" id="discountCodeInput" placeholder="Kodas, pvz. VASARA10" style="text-transform:uppercase;">
        </div>
        <div class="wh-add-row" style="flex-wrap:wrap;">
          <input type="number" min="0" max="100" step="1" id="discountPercentInput" placeholder="%" style="min-width:70px;flex:1;">
          <button class="btn btn-primary btn-sm" id="addDiscountBtn">+ Pridėti</button>
        </div>
        <div class="checkrow" style="margin-top:8px;"><input type="checkbox" id="discountMultiUseInput"><label for="discountMultiUseInput" style="margin:0;text-transform:none;font-weight:500;">Daugkartinis kodas (gali naudoti keli klientai)</label></div>
        <div style="margin-top:14px;">${discountRows}</div>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Dovanų kuponai</h4>
        <p class="combo-hint" style="margin-bottom:10px;">Sukurk dovanų kuponą fiksuotai pinigų sumai - bus sugeneruotas atsisiunčiamas PDF su kodu.</p>
        <button type="button" class="btn btn-primary btn-sm" id="openGiftCouponModalBtn">+ Kurti dovanų kuponą</button>
        <div style="margin-top:14px;">${couponRows}</div>
      </div>
      ${offerModalOpen ? offerModalHtml() : ''}
    </div>`;
  }


  const EMAIL_TEMPLATE_ORDER = ['orderReceived', 'orderConfirmed'];

  function emailTemplatesSectionHtml(){
    if(emailTemplateEditingKey) return emailTemplateEditorHtml(emailTemplateEditingKey);
    return `<div class="sub-section">
      <div class="inner-block" style="max-width:680px;">
        <h4 class="section-h4">El. laiškų šablonai</h4>
        <p class="combo-hint" style="margin-bottom:14px;">Redaguok laiškų HTML kodą ir iš karto matyk, kaip laiškas atrodys kompiuteryje ar telefone.</p>
        ${EMAIL_TEMPLATE_ORDER.map(key=>{
          const tpl = emailTemplates[key] || DEFAULT_EMAIL_TEMPLATES[key];
          return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--box-line);">
            <div>
              <div style="font-weight:600;">${escapeHtml(tpl.name)}</div>
              <div class="combo-hint" style="margin:2px 0 0;">${escapeHtml(tpl.description||'')}</div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" data-edit-email-template="${key}" style="flex:0 0 auto;">Redaguoti</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  function emailTemplateEditorHtml(key){
    const tpl = emailTemplates[key] || DEFAULT_EMAIL_TEMPLATES[key];
    const isMobile = emailTemplatePreviewMode==='mobile';
    return `<div class="sub-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <h4 class="section-h4" style="margin:0;">${escapeHtml(tpl.name)}</h4>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-ghost btn-sm" id="backToEmailTemplatesBtn">← Atgal</button>
          <button type="button" class="btn btn-primary btn-sm" id="saveEmailTemplateBtn">Išsaugoti</button>
        </div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">
        <div style="flex:1 1 380px;min-width:280px;">
          <p class="combo-hint" style="margin:0 0 6px;">HTML kodas</p>
          <textarea id="emailTemplateCodeInput" data-email-template-key="${key}" spellcheck="false" style="width:100%;min-height:540px;font-family:'SF Mono',Consolas,monospace;font-size:12px;line-height:1.5;padding:12px;border-radius:8px;border:1px solid var(--box-line);box-sizing:border-box;background:var(--cream);">${escapeHtml(tpl.html)}</textarea>
        </div>
        <div style="flex:1 1 320px;min-width:260px;">
          <div style="display:flex;gap:6px;margin-bottom:8px;">
            <button type="button" class="btn ${!isMobile?'btn-primary':'btn-ghost'} btn-sm" data-email-preview-mode="desktop">🖥️ Kompiuteris</button>
            <button type="button" class="btn ${isMobile?'btn-primary':'btn-ghost'} btn-sm" data-email-preview-mode="mobile">📱 Telefonas</button>
          </div>
          <p class="combo-hint" style="margin:0 0 6px;">Tekstą gali redaguoti ir tiesiai čia (paryškintos vietos - tai automatiškai įrašomi duomenys, pvz. vardas ar kaina, jų tekstas nekeičiamas).</p>
          <div style="border:1px solid var(--box-line);border-radius:10px;background:#e9e5e0;padding:16px;display:flex;justify-content:center;">
            <iframe id="emailTemplatePreviewFrame" style="width:${isMobile?'375px':'100%'};max-width:100%;height:560px;border:none;background:#fff;border-radius:6px;"></iframe>
          </div>
        </div>
      </div>
    </div>`;
  }

  function settingsSectionHtml(){
    let lastBackupText = 'Atsarginė kopija dar nedaryta.';
    let backupWarning = `<p class="combo-hint" style="color:var(--berry);font-weight:600;margin:4px 0 12px;">⚠️ Atsarginė kopija dar nė karto nedaryta - rekomenduojame pasidaryti dabar.</p>`;
    if(orderSettings.lastBackupAt){
      const days = Math.max(0, Math.floor((Date.now() - new Date(orderSettings.lastBackupAt).getTime()) / 86400000));
      lastBackupText = `Paskutinė atsarginė kopija: ${formatDateLong(orderSettings.lastBackupAt.slice(0,10))} (prieš ${days} d.)`;
      backupWarning = days >= 7
        ? `<p class="combo-hint" style="color:var(--berry);font-weight:600;margin:4px 0 12px;">⚠️ Nuo paskutinės kopijos praėjo ${days} d. - rekomenduojame pasidaryti naują.</p>`
        : '';
    }
    return `<div class="sub-section">
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">💾 Atsarginė kopija</h4>
        <p class="combo-hint" style="margin:0 0 4px;">${lastBackupText}</p>
        ${backupWarning}
        <p class="combo-hint" style="margin:0 0 12px;">Atsisiųsk vieną failą su visais duomenimis (užsakymai, sąskaitos, išlaidos, žinutės, atsiliepimai, saugykla, nustatymai). Laikyk jį saugioje vietoje (pvz. Google Drive), kad Firebase projekto problemos atveju nieko neprarastum.</p>
        <button class="btn btn-primary btn-sm" id="downloadBackupBtn">Atsisiųsti atsarginę kopiją</button>
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line);">
          <p class="combo-hint" style="margin:0 0 10px;"><b>Atkūrimas iš kopijos</b> - naudok tik jei duomenys buvo prarasti. Perrašys esamus įrašus tais pačiais ID iš pasirinkto failo.</p>
          <input type="file" id="restoreBackupFile" accept="application/json" style="display:none;">
          <button class="btn btn-ghost btn-sm" id="restoreBackupBtn">Atkurti iš kopijos…</button>
        </div>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">🧪 Testavimo mygtukai</h4>
        <div class="toggle-row">
          <label class="toggle-switch">
            <input type="checkbox" id="toggleFormTestingButtons" ${orderSettings.showFormTestingButtons !== false ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
          <div>
            <div style="font-weight:700;font-size:14px;">Rodyti „📝 Kliento užsakymo forma" ir „🔗 Nukopijuoti formos adresą"</div>
            <p class="combo-hint" style="margin:2px 0 0;">Naudingi testuojant puslapį - kai baigsi testuoti, gali išjungti, kad neužimtų vietos meniu apačioje.</p>
          </div>
        </div>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Skonių ir spalvų derinių skaičius</h4>
        <div class="wh-stock-row"><span>Didelio torto maks. derinių sk.</span><input type="number" min="1" max="10" id="setMaxLarge" value="${orderSettings.maxLarge}"></div>
        <div class="wh-stock-row"><span>Mažo torto maks. derinių sk.</span><input type="number" min="1" max="10" id="setMaxSmall" value="${orderSettings.maxSmall}"></div>
        <div class="wh-stock-row"><span>Didelių indelių maks. derinių sk.</span><input type="number" min="1" max="10" id="setMaxJarLarge" value="${orderSettings.maxJarLarge}"></div>
        <div class="wh-stock-row"><span>Mažų indelių maks. derinių sk.</span><input type="number" min="1" max="10" id="setMaxJarSmall" value="${orderSettings.maxJarSmall}"></div>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Minimalus užsakomų produktų kiekis</h4>
        <div class="wh-stock-row"><span>Mažų tortų minimalus kiekis (vnt.)</span><input type="number" min="1" id="setMinSmallCake" value="${orderSettings.minSmallCake||1}"></div>
        <div class="wh-stock-row"><span>Didelių tortų minimalus kiekis (vnt.)</span><input type="number" min="1" id="setMinLargeCake" value="${orderSettings.minLargeCake||1}"></div>
        <div class="wh-stock-row"><span>Mažų indelių minimalus kiekis (vnt.)</span><input type="number" min="1" id="setMinSmallJar" value="${orderSettings.minSmallJar||1}"></div>
        <div class="wh-stock-row"><span>Didelių indelių minimalus kiekis (vnt.)</span><input type="number" min="1" id="setMinLargeJar" value="${orderSettings.minLargeJar||1}"></div>
        <p class="combo-hint" style="margin-top:8px;">Jei klientas užsako bent vieną tam tikro tipo produktą, jo kiekis turi būti ne mažesnis už čia nurodytą.</p>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Facebook Pixel (reklamos sekimas)</h4>
        <div class="wh-add-row">
          <input type="text" id="setFbPixelId" placeholder="pvz. 1234567890123456" value="${escapeAttr(orderSettings.fbPixelId||'')}" style="flex:1;">
          <button class="btn btn-primary btn-sm" id="saveFbPixelBtn">Išsaugoti</button>
        </div>
        <p class="combo-hint">Įvesk savo Meta (Facebook) Pixel ID iš Events Manager. Kai jis įvestas, kliento užsakymo formoje bus automatiškai skaičiuojami apsilankymai ir pateikti užsakymai (Purchase įvykiai), kad Facebook Ads Manager'yje matytum, kiek žmonių atėjo iš reklamos ir kiek jų užsakė. Palik tuščią, jei pixel dar nesukurtas.</p>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Užsakymo formos adresas</h4>
        <div class="wh-add-row">
          <input type="text" id="setFormUrl" placeholder="https://..." value="${escapeAttr(orderSettings.formUrl||'')}" style="flex:1;">
          <button class="btn btn-primary btn-sm" id="saveFormUrlBtn">Išsaugoti</button>
        </div>
        <p class="combo-hint">Šis adresas bus kopijuojamas paspaudus „Nukopijuoti užsakymo formos adresą" antraštėje.</p>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Pranešimas apie gautą užsakymą</h4>
        <div class="toggle-row" style="margin-bottom:12px;">
          <label class="toggle-switch">
            <input type="checkbox" id="toggleNotifyEmail" ${orderSettings.notifyEmailEnabled?'checked':''}>
            <span class="toggle-track"></span>
          </label>
          <div>
            <div style="font-weight:700;font-size:14px;">Siųsti pranešimą el. paštu</div>
            <p class="combo-hint" style="margin:2px 0 0;">Kai išjungta, laiškai nesiunčiami, bet žemiau įrašyti adresai išlieka - įjungus vėl, ims veikti iš karto.</p>
          </div>
        </div>
        <div class="wh-add-row">
          <input type="text" id="setNotifyEmail" placeholder="el. paštas" style="flex:1;">
          <button class="btn btn-primary btn-sm" id="addNotifyEmailBtn">Pridėti</button>
        </div>
        <p class="combo-hint">Visi žemiau esantys adresai gaus laišką, kai klientas pateiks užsakymą per kliento formą.</p>
        <div>${(orderSettings.notifyEmails||[]).length ? orderSettings.notifyEmails.map(email=>`<div class="wh-stock-row">
          <span>${escapeHtml(email)}</span>
          <button class="chip-x" data-notify-email-remove="${escapeAttr(email)}">×</button>
        </div>`).join('') : `<p class="wh-empty">Nėra pridėtų el. pašto adresų</p>`}</div>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">📲 Push pranešimas telefonui (ntfy)</h4>
        <div class="toggle-row" style="margin-bottom:12px;">
          <label class="toggle-switch">
            <input type="checkbox" id="toggleNotifyNtfy" ${orderSettings.notifyNtfyEnabled?'checked':''}>
            <span class="toggle-track"></span>
          </label>
          <div>
            <div style="font-weight:700;font-size:14px;">Siųsti push pranešimą per ntfy</div>
            <p class="combo-hint" style="margin:2px 0 0;">Kai išjungta, pranešimai telefonui nesiunčiami, bet įrašyta tema žemiau išlieka.</p>
          </div>
        </div>
        <p class="combo-hint" style="margin-bottom:10px;">Vietoj (arba kartu su) el. laišku gali gauti pranešimą tiesiai į telefoną per nemokamą programėlę <b>ntfy</b> (App Store / Google Play). Įdiegęs programėlę, pridėk temą (topic) žemiau ir tą pačią temą užsiprenumeruok programėlėje - joks papildomas prisijungimas nereikalingas. Rekomenduojame pasirinkti neaiškiai atspėjamą temos pavadinimą, kad kiti žmonės atsitiktinai jo neužsiprenumeruotų.</p>
        <p class="combo-hint" style="margin-bottom:10px;">Pranešimas atkeliauja gavus naują užsakymą per kliento formą arba naują žinutę svetainėje (per apačioje esančią formą arba pokalbių burbulą). Tikri el. laiškai, ateinantys į info@saldupuru.lt, į svetainę patenka per išorinį Zapier scenarijų, todėl jiems ši ntfy tema tiesiogiai netaikoma - apie tai atskirai.</p>
        <div class="wh-add-row">
          <input type="text" id="setNtfyTopic" placeholder="Pvz. saldupuru-uzsakymai-x7k2m" value="${escapeAttr(orderSettings.ntfyTopic||'')}" style="flex:1;">
          <button class="btn btn-primary btn-sm" id="saveNtfyTopicBtn">Išsaugoti</button>
        </div>
        <p class="combo-hint" style="margin-top:8px;">Norėdamas gauti pranešimus TIK per ntfy (be laiškų), ištrink visus el. pašto adresus aukščiau.</p>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Informacija apie produktus (rodoma kliento formoje)</h4>
        <div class="field"><label>Didelis tortas</label><input type="text" id="setInfoLargeCake" placeholder="Pvz. 2-4 asmenims, 20 cm skersmens" value="${escapeAttr(orderSettings.infoLargeCake||'')}"></div>
        <div class="field"><label>Mažas tortas</label><input type="text" id="setInfoSmallCake" placeholder="Pvz. 1-2 asmenims, 12 cm skersmens" value="${escapeAttr(orderSettings.infoSmallCake||'')}"></div>
        <div class="field"><label>Didelis indelis</label><input type="text" id="setInfoLargeJar" placeholder="Pvz. 250 ml" value="${escapeAttr(orderSettings.infoLargeJar||'')}"></div>
        <div class="field"><label>Mažas indelis</label><input type="text" id="setInfoSmallJar" placeholder="Pvz. 150 ml" value="${escapeAttr(orderSettings.infoSmallJar||'')}"></div>
        <button class="btn btn-primary btn-sm" id="saveInfoTextsBtn">Išsaugoti</button>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Užsakymų numeracija</h4>
        <p class="combo-hint" style="margin:0 0 8px;">Kitas užsakymo numeris bus: <b>${(orderCounterCache||0)+1}</b></p>
        <button class="btn btn-ghost btn-sm" id="resetOrderCounterBtn">Reset</button>
        <p class="combo-hint" style="margin-top:6px;">Perskaičiuoja kitą numerį pagal didžiausią numerį tarp esamų (neištrintų) užsakymų. Naudinga po testavimo.</p>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Dekoro informacija</h4>
        <p class="combo-hint" style="margin:0 0 8px;">Šis tekstas rodomas kliento formoje, paspaudus ar užvedus ant informacinės (i) piktogramos šalia „Reikia dekoro" varnelės.</p>
        <div class="field"><textarea id="setDecorInfo" rows="4" placeholder="Pvz. Dekoras – tai papildomas ornamentas ant torto viršaus, pasirenkamas iš mūsų siūlomų variantų.">${escapeHtml(orderSettings.decorInfo||'')}</textarea></div>
        <button class="btn btn-primary btn-sm" id="saveDecorInfoBtn">Išsaugoti</button>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Informacija apie produktus</h4>
        <p class="combo-hint" style="margin:0 0 8px;">Šis tekstas rodomas kliento formoje, paspaudus ar užvedus ant informacinės (i) piktogramos šalia „Užsakomi produktai" antraštės.</p>
        <div class="field"><textarea id="setProductsInfoText" rows="4" placeholder="Pvz. Didelis tortas skirtas ~15 žmonių, mažas – ~6 žmonėms.">${escapeHtml(orderSettings.productsInfoText||'')}</textarea></div>
        <button class="btn btn-primary btn-sm" id="saveProductsInfoBtn">Išsaugoti</button>
      </div>
      <div class="inner-block" style="max-width:560px;">
        <h4 class="section-h4">Užsakymų priėmimo laikas</h4>
        <p class="combo-hint" style="margin:0 0 8px;">Kiek dienų iki norimos užsakymo datos turi likti, kad klientas dar galėtų užsisakyti kliento formoje. Pvz. įvedus 2, jei norima gauti užsakymą šeštadienį, vėliausia galima užsakymo diena yra ketvirtadienis.</p>
        <div class="field" style="max-width:200px;">
          <label>Dienų iš anksto</label>
          <input type="number" min="0" id="setMinLeadDays" value="${orderSettings.minLeadDays||0}">
        </div>
        <button class="btn btn-primary btn-sm" id="saveMinLeadDaysBtn">Išsaugoti</button>
      </div>
    </div>`;
  }


  function openAttachment(dataUrl){
    try{
      const [header, b64] = dataUrl.split(',');
      const mimeMatch = header.match(/data:(.*?);base64/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {type: mime});
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(()=>URL.revokeObjectURL(blobUrl), 60000);
    }catch(e){
      console.error('Nepavyko atidaryti priedo', e);
      alert('Nepavyko atidaryti prisegto failo.');
    }
  }


  function downloadDataUrl(dataUrl, filename){
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }


  function generateExpensePdf(expense){
    const isPdfAttachment = expense.attachmentDataUrl && expense.attachmentDataUrl.startsWith('data:application/pdf');
    if(isPdfAttachment){
      // already a PDF - just download it as-is, no need to regenerate
      downloadDataUrl(expense.attachmentDataUrl, `islaida_${expense.date}.pdf`);
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'mm', format:'a4'});
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_B64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_B64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    const berry=[184,53,95], choc=[59,42,40], chocSoft=[110,90,82];
    const marginL=15, marginR=195;
    let y = 20;

    doc.setFont('Roboto','bold'); doc.setFontSize(16); doc.setTextColor(...berry);
    doc.text('Išlaidos įrašas', marginL, y);
    y += 10;
    doc.setDrawColor(...berry); doc.line(marginL, y, marginR, y);
    y += 8;

    doc.setFont('Roboto','normal'); doc.setFontSize(10.5); doc.setTextColor(...choc);
    doc.text(`Data: ${formatDate(expense.date)}`, marginL, y); y += 6;
    doc.text(`Aprašymas: ${expense.description||'-'}`, marginL, y); y += 6;
    doc.text(`Kategorija: ${expense.category||'-'}`, marginL, y); y += 6;
    doc.setFont('Roboto','bold'); doc.setTextColor(...berry);
    doc.text(`Suma: ${(expense.amount||0).toFixed(2)} €`, marginL, y);
    y += 12;

    if(expense.attachmentDataUrl && expense.attachmentDataUrl.startsWith('data:image')){
      doc.setFont('Roboto','normal'); doc.setFontSize(9.5); doc.setTextColor(...chocSoft);
      doc.text('Prisegtas dokumentas:', marginL, y);
      y += 5;
      try{
        const imgProps = doc.getImageProperties(expense.attachmentDataUrl);
        const maxW = marginR - marginL;
        const maxH = 260 - y;
        let w = maxW, h = (imgProps.height * w) / imgProps.width;
        if(h > maxH){ h = maxH; w = (imgProps.width * h) / imgProps.height; }
        doc.addImage(expense.attachmentDataUrl, 'JPEG', marginL, y, w, h);
      }catch(e){ console.error('Nepavyko įterpti nuotraukos į PDF', e); }
    }

    doc.save(`islaida_${expense.date}.pdf`);
  }


  function renderStatsCharts(){
    const stats = computeBusinessStats(statsYear);

    const cardsStats = cardsYear===statsYear ? stats : computeBusinessStats(cardsYear);
    let cardIncome, cardExpenses, cardAvg, cardProfit;
    if(cardsMode === 'year'){
      cardIncome = cardsStats.totalIncome;
      cardExpenses = cardsStats.totalExpenses;
      cardAvg = cardsStats.avgOrder;
      cardProfit = cardsStats.netProfit;
    } else {
      const m = cardsStats.months[cardsMonth];
      cardIncome = Math.round(m.income*100)/100;
      cardExpenses = Math.round(m.expenses*100)/100;
      cardAvg = m.orderCount ? Math.round((m.income/m.orderCount)*100)/100 : 0;
      cardProfit = Math.round((m.income - m.cogs - m.expenses)*100)/100;
    }
    const incomeEl = document.getElementById('statsTotalIncome');
    const expensesEl = document.getElementById('statsTotalExpenses');
    const avgEl = document.getElementById('statsAvgOrder');
    const profitEl = document.getElementById('statsProfit');
    if(incomeEl) incomeEl.textContent = `${cardIncome.toFixed(2)} €`;
    if(expensesEl) expensesEl.textContent = `${cardExpenses.toFixed(2)} €`;
    if(avgEl) avgEl.textContent = `${cardAvg.toFixed(2)} €`;
    if(profitEl){
      profitEl.textContent = `${cardProfit.toFixed(2)} €`;
      profitEl.classList.toggle('stats-positive', cardProfit >= 0);
      profitEl.classList.toggle('stats-negative', cardProfit < 0);
    }

    const incomeCanvas = document.getElementById('incomeChart');
    if(incomeCanvas && window.Chart){
      if(incomeChartInstance){ incomeChartInstance.destroy(); incomeChartInstance = null; }
      incomeChartInstance = new Chart(incomeCanvas, {
        type: 'bar',
        data: {
          labels: stats.months.map(m=>m.label),
          datasets: [{
            label: 'Pajamos (€)',
            data: stats.months.map(m=>Math.round(m.income*100)/100),
            backgroundColor: '#5E6E42',
            borderRadius: 6,
          }, {
            label: 'Išlaidos (€)',
            data: stats.months.map(m=>Math.round(m.expenses*100)/100),
            backgroundColor: '#B8355F',
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'bottom' } },
          scales: { y: { beginAtZero: true } },
        },
      });
    }

    const ordersCountCanvas = document.getElementById('ordersCountChart');
    if(ordersCountCanvas && window.Chart){
      if(ordersCountChartInstance){ ordersCountChartInstance.destroy(); ordersCountChartInstance = null; }
      ordersCountChartInstance = new Chart(ordersCountCanvas, {
        type: 'bar',
        data: {
          labels: stats.months.map(m=>m.label),
          datasets: [{
            label: 'Užsakymų skaičius',
            data: stats.months.map(m=>m.orderCount),
            backgroundColor: '#C9932E',
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      });
    }

    const productsCanvas = document.getElementById('productsChart');
    if(productsCanvas && window.Chart){
      if(productsChartInstance){ productsChartInstance.destroy(); productsChartInstance = null; }
      const productsPrefix = productsMode==='year' ? `${productsYear}-` : `${productsYear}-${String(productsMonth+1).padStart(2,'0')}`;
      const popularProducts = computeProductStats(productsPrefix);
      const productColors = ['#B8355F', '#C9932E', '#5E6E42', '#6B7FBF', '#B0685E', '#8E5DA6'];
      productsChartInstance = new Chart(productsCanvas, {
        type: 'bar',
        data: {
          labels: popularProducts.map(p=>p[0]),
          datasets: [{
            label: 'Kiekis (vnt.)',
            data: popularProducts.map(p=>p[1]),
            backgroundColor: popularProducts.map((p,i)=>productColors[i % productColors.length]),
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } },
        },
      });
    }
  }


  function computeReminders(){
    const todayStr = fmtISO(new Date());
    const tomorrowStr = fmtISO(new Date(Date.now() + 24*60*60*1000));
    const activeOrders = orders.filter(o=>o.status!=='ivykdyta');

    const tomorrowProduction = activeOrders.filter(o=>o.neededDate===tomorrowStr && o.status!=='pagaminta');
    const todayPickup = activeOrders.filter(o=>o.neededDate===todayStr);
    const unpaid = activeOrders.filter(o=>!o.paid && o.neededDate && o.neededDate<=tomorrowStr);
    const overdueProduction = activeOrders.filter(o=>o.neededDate && o.neededDate<=todayStr && o.status!=='pagaminta');

    return { tomorrowProduction, todayPickup, unpaid, overdueProduction };
  }


  function lowStockFlavors(){
    if(!warehouse.flavorStock || warehouse.minFlavorStockAlertsOn===false) return [];
    const min = warehouse.minFlavorStock;
    if(min===null || min===undefined || min==='') return [];
    return warehouse.flavors.filter(f=>{
      const stock = warehouse.flavorStock[f];
      return typeof stock === 'number' && stock < min;
    }).map(f=>({flavor:f, stock:warehouse.flavorStock[f]}));
  }

  function reminderBannerHtml(){
    const r = computeReminders();
    const items = [];
    if(r.overdueProduction.length) items.push({icon:'⚠️', text:`Reikia skubiai pagaminti (${r.overdueProduction.length})`, cls:'rem-urgent', filter:'overdue'});
    if(r.tomorrowProduction.length) items.push({icon:'🎂', text:`Rytojui reikia pagaminti (${r.tomorrowProduction.length})`, cls:'rem-warn', filter:'tomorrow'});
    if(r.todayPickup.length) items.push({icon:'📦', text:`Šiandien atsiėmimas (${r.todayPickup.length})`, cls:'rem-info', filter:'today'});
    r.unpaid.forEach(o=>items.push({icon:'💶', text:`Klientas dar nesumokėjo: ${escapeHtml(o.customerName||'Be vardo')} (Nr. ${formatOrderNumber(o.orderNumber)})`, cls:'rem-danger', filter:null, orderId:o.id}));
    lowStockFlavors().forEach(({flavor,stock})=>items.push({icon:'🧴', text:`${escapeHtml(flavor)} - mažas likutis sandėlyje: ${stock} - reikia užsakyti`, cls:'rem-warn', filter:null, gotoWarehouse:true}));
    if(!items.length) return '';
    return `<div class="reminders-banner">
      ${items.map(it=>`<div class="reminder-item ${it.cls}" ${it.filter?`data-reminder-filter="${it.filter}"`:''} ${it.orderId?`data-reminder-order="${it.orderId}"`:''} ${it.gotoWarehouse?`data-reminder-goto-warehouse="1"`:''}><span class="reminder-icon">${it.icon}</span><span>${it.text}</span></div>`).join('')}
    </div>`;
  }


  function computeProductStats(datePrefix){
    const productCounts = { 'Didelis tortas':0, 'Mažas tortas':0, 'Didelis indelis':0, 'Mažas indelis':0 };
    orders.forEach(o=>{
      if(!o.neededDate || !o.neededDate.startsWith(datePrefix)) return;
      productCounts['Didelis tortas'] += (o.largeCakes||[]).length;
      productCounts['Mažas tortas'] += (o.smallCakes||[]).length;
      productCounts['Didelis indelis'] += (o.jarQtyLarge||0);
      productCounts['Mažas indelis'] += (o.jarQtySmall||0);
    });
    return Object.entries(productCounts).sort((a,b)=>b[1]-a[1]);
  }


  function computeBusinessStats(year){
    year = year || new Date().getFullYear();
    const months = [];
    for(let m=0; m<12; m++){
      months.push({ key: `${year}-${String(m+1).padStart(2,'0')}`, label: `${MONTH_SHORT[m]} ${year}`, income:0, cogs:0, expenses:0, orderCount:0 });
    }
    const monthIndex = {}; months.forEach((m,i)=>monthIndex[m.key]=i);
    const yearPrefix = `${year}-`;

    function costForOrder(o){
      return (o.largeCakes||[]).length*computeProductCost('large_cake')
        + (o.smallCakes||[]).length*computeProductCost('small_cake')
        + (o.jarQtyLarge||0)*computeProductCost('large_jar')
        + (o.jarQtySmall||0)*computeProductCost('small_jar');
    }

    let totalIncome = 0, totalOrders = 0, totalCogs = 0;
    const productCounts = { 'Didelis tortas':0, 'Mažas tortas':0, 'Didelis indelis':0, 'Mažas indelis':0 };
    const flavorCounts = {};

    orders.forEach(o=>{
      if(!o.neededDate || !o.neededDate.startsWith(yearPrefix)) return;
      const key = o.neededDate.slice(0,7);
      const price = parseFloat(o.price)||0;
      const cogs = costForOrder(o);
      if(monthIndex[key]!==undefined){
        months[monthIndex[key]].income += price;
        months[monthIndex[key]].cogs += cogs;
        months[monthIndex[key]].orderCount += 1;
      }
      totalIncome += price; totalOrders += 1; totalCogs += cogs;
      productCounts['Didelis tortas'] += (o.largeCakes||[]).length;
      productCounts['Mažas tortas'] += (o.smallCakes||[]).length;
      productCounts['Didelis indelis'] += (o.jarQtyLarge||0);
      productCounts['Mažas indelis'] += (o.jarQtySmall||0);
      [].concat(o.largeCakes||[], o.smallCakes||[]).forEach(u=>{
        (u.combos||[]).forEach(c=>{ if(c.flavor){ flavorCounts[c.flavor] = (flavorCounts[c.flavor]||0)+1; } });
      });
      (o.jarLargeCombos||[]).concat(o.jarSmallCombos||[]).forEach(c=>{
        if(c.flavor){ flavorCounts[c.flavor] = (flavorCounts[c.flavor]||0)+1; }
      });
    });

    expenses.forEach(ex=>{
      if(!ex.date || !ex.date.startsWith(yearPrefix)) return;
      const key = ex.date.slice(0,7);
      if(monthIndex[key]!==undefined) months[monthIndex[key]].expenses += (ex.amount||0);
    });
    const totalExpenses = months.reduce((s,m)=>s+m.expenses, 0);

    const popularProducts = Object.entries(productCounts).sort((a,b)=>b[1]-a[1]);
    const popularFlavors = Object.entries(flavorCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);

    return {
      year, months,
      totalIncome: Math.round(totalIncome*100)/100,
      totalOrders,
      avgOrder: totalOrders ? Math.round((totalIncome/totalOrders)*100)/100 : 0,
      totalCogs: Math.round(totalCogs*100)/100,
      totalExpenses: Math.round(totalExpenses*100)/100,
      netProfit: Math.round((totalIncome-totalCogs-totalExpenses)*100)/100,
      popularProducts, popularFlavors,
    };
  }


  function getJournalDateRange(){
    return {
      start: journalFilterStart || `${CURRENT_YEAR_STR}-01-01`,
      end: journalFilterEnd || `${CURRENT_YEAR_STR}-12-31`,
    };
  }


  function computeFinancialReport(start, end){
    const incomeEntries = invoices.filter(inv=>inv.issueDate >= start && inv.issueDate <= end);
    const expenseEntries = expenses.filter(ex=>ex.date >= start && ex.date <= end);
    const totalIncome = incomeEntries.reduce((s,i)=>s+i.totalAmount, 0);
    const totalExpenses = expenseEntries.reduce((s,e)=>s+(e.amount||0), 0);
    const byCategory = {};
    expenseEntries.forEach(e=>{
      const cat = e.category || 'Be kategorijos';
      byCategory[cat] = (byCategory[cat]||0) + (e.amount||0);
    });
    return {
      start, end, incomeEntries, expenseEntries,
      totalIncome: Math.round(totalIncome*100)/100,
      totalExpenses: Math.round(totalExpenses*100)/100,
      netProfit: Math.round((totalIncome-totalExpenses)*100)/100,
      byCategory: Object.entries(byCategory).map(([name,amount])=>({name, amount: Math.round(amount*100)/100})),
    };
  }


  function generateReportPdf(report){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'mm', format:'a4'});
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_B64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_B64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    const berry=[184,53,95], choc=[59,42,40], chocSoft=[110,90,82];
    const marginL=15, marginR=195;
    let y = 20;
    doc.setFont('Roboto','bold'); doc.setFontSize(18); doc.setTextColor(...berry);
    doc.text('Finansinė ataskaita', marginL, y);
    y += 8;
    doc.setFont('Roboto','normal'); doc.setFontSize(10); doc.setTextColor(...chocSoft);
    doc.text(`Laikotarpis: ${formatDate(report.start)} – ${formatDate(report.end)}`, marginL, y);
    y += 10;
    doc.setDrawColor(...berry); doc.line(marginL, y, marginR, y);
    y += 9;

    doc.setFont('Roboto','bold'); doc.setFontSize(12); doc.setTextColor(...choc);
    doc.text(`Iš viso pajamų: ${report.totalIncome.toFixed(2)} €`, marginL, y); y += 7;
    doc.text(`Iš viso išlaidų: ${report.totalExpenses.toFixed(2)} €`, marginL, y); y += 7;
    doc.setTextColor(...berry);
    doc.text(`Grynasis pelnas: ${report.netProfit.toFixed(2)} €`, marginL, y); y += 12;

    if(report.byCategory.length){
      doc.setFont('Roboto','bold'); doc.setFontSize(11); doc.setTextColor(...choc);
      doc.text('Išlaidos pagal kategoriją', marginL, y); y += 7;
      doc.setFont('Roboto','normal'); doc.setFontSize(10); doc.setTextColor(...chocSoft);
      report.byCategory.forEach(c=>{
        doc.text(c.name, marginL, y);
        doc.text(`${c.amount.toFixed(2)} €`, marginR, y, {align:'right'});
        y += 6;
      });
      y += 6;
    }

    doc.setFont('Roboto','bold'); doc.setFontSize(11); doc.setTextColor(...choc);
    doc.text('Pajamos (sąskaitos)', marginL, y); y += 7;
    doc.setFont('Roboto','normal'); doc.setFontSize(9.5); doc.setTextColor(...chocSoft);
    report.incomeEntries.forEach(inv=>{
      if(y > 275){ doc.addPage(); y = 20; }
      doc.text(`${formatDate(inv.issueDate)}  SF ${formatInvoiceNumber(inv)}  ${inv.buyerName||''}`, marginL, y);
      doc.text(`${inv.totalAmount.toFixed(2)} €`, marginR, y, {align:'right'});
      y += 5.5;
    });
    y += 6;
    if(y > 260){ doc.addPage(); y = 20; }
    doc.setFont('Roboto','bold'); doc.setFontSize(11); doc.setTextColor(...choc);
    doc.text('Išlaidos', marginL, y); y += 7;
    doc.setFont('Roboto','normal'); doc.setFontSize(9.5); doc.setTextColor(...chocSoft);
    const withImageAttachments = [];
    const withPdfAttachments = [];
    report.expenseEntries.forEach(ex=>{
      if(y > 275){ doc.addPage(); y = 20; }
      const hasAttachment = !!ex.attachmentDataUrl;
      doc.text(`${formatDate(ex.date)}  ${ex.description||''} (${ex.category||'-'})${hasAttachment?' 📎':''}`, marginL, y);
      doc.text(`${(ex.amount||0).toFixed(2)} €`, marginR, y, {align:'right'});
      y += 5.5;
      if(hasAttachment){
        if(ex.attachmentDataUrl.startsWith('data:image')) withImageAttachments.push(ex);
        else withPdfAttachments.push(ex);
      }
    });

    if(withImageAttachments.length){
      doc.addPage(); y = 20;
      doc.setFont('Roboto','bold'); doc.setFontSize(14); doc.setTextColor(...berry);
      doc.text('Priedai (sąskaitos, čekiai)', marginL, y); y += 10;
      withImageAttachments.forEach(ex=>{
        const maxW = marginR-marginL, maxH = 90;
        let w = maxW, h = maxW*0.7;
        try{
          const props = doc.getImageProperties(ex.attachmentDataUrl);
          h = Math.min(maxH, (props.height*w)/props.width);
          w = (props.width*h)/props.height;
        }catch(e){}
        if(y + h + 14 > 285){ doc.addPage(); y = 20; }
        doc.setFont('Roboto','normal'); doc.setFontSize(9.5); doc.setTextColor(...chocSoft);
        doc.text(`${formatDate(ex.date)} - ${ex.description||''} (${(ex.amount||0).toFixed(2)} €)`, marginL, y);
        y += 5;
        try{ doc.addImage(ex.attachmentDataUrl, 'JPEG', marginL, y, w, h); }catch(e){}
        y += h + 12;
      });
    }
    if(withPdfAttachments.length){
      if(y > 265){ doc.addPage(); y = 20; }
      y += 4;
      doc.setFont('Roboto','bold'); doc.setFontSize(10.5); doc.setTextColor(...choc);
      doc.text('PDF formato priedai (peržiūrėk sistemoje):', marginL, y); y += 6;
      doc.setFont('Roboto','normal'); doc.setFontSize(9.5); doc.setTextColor(...chocSoft);
      withPdfAttachments.forEach(ex=>{
        if(y > 280){ doc.addPage(); y = 20; }
        doc.text(`• ${formatDate(ex.date)} - ${ex.description||''} (${ex.attachmentName||'priedas.pdf'})`, marginL, y);
        y += 5.5;
      });
    }

    doc.save(`ataskaita_${report.start}_${report.end}.pdf`);
  }



  function buildInvoicePdfDoc(invoice){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'mm', format:'a4'});

    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_B64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_B64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto','normal');

    const berry = [184,53,95];
    const choc = [59,42,40];
    const chocSoft = [110,90,82];
    const pageWidth = 210;
    const marginL = 15, marginR = 195;
    let y = 18;

    try{ doc.addImage(`data:image/png;base64,${LOGO_BASE64}`, 'PNG', marginL, y, 24, 24); }catch(e){}
    doc.setTextColor(...berry);
    doc.setFontSize(19);
    doc.setFont('Roboto','bold');
    doc.text('SĄSKAITA FAKTŪRA', 45, y+9);
    doc.setFontSize(12);
    doc.setTextColor(...choc);
    doc.text(`Serija ${(invoice.series||'SP')} Nr. ${formatOrderNumber(invoice.invoiceNumber)}`, 45, y+17);
    doc.setFontSize(10);
    doc.setTextColor(...chocSoft);
    doc.setFont('Roboto','normal');
    doc.text(`Išrašymo data: ${formatDate(invoice.issueDate)}`, 45, y+23);

    y += 34;
    doc.setDrawColor(...berry);
    doc.setLineWidth(0.6);
    doc.line(marginL, y, marginR, y);
    y += 8;

    const colX1 = marginL, colX2 = 110;
    doc.setFontSize(10);
    doc.setFont('Roboto','bold');
    doc.setTextColor(...choc);
    doc.text('PARDAVĖJAS', colX1, y);
    doc.text('Pirkėjas', colX2, y);
    y += 6;
    doc.setFont('Roboto','normal');
    doc.setTextColor(...chocSoft);
    const sellerLines = [
      orderSettings.sellerName || '-',
      orderSettings.sellerActivityCode ? `Ind. Veiklos kodas: ${orderSettings.sellerActivityCode}` : '',
      orderSettings.sellerAddress ? `adresas: ${orderSettings.sellerAddress}` : '',
      orderSettings.sellerBankInfo ? `a. s.: ${orderSettings.sellerBankInfo}` : '',
    ].filter(Boolean);
    const buyerLines = [
      invoice.buyerName || '-',
      invoice.buyerCode ? `Kodas: ${invoice.buyerCode}` : '',
      invoice.buyerVat ? `PVM kodas: ${invoice.buyerVat}` : '',
      invoice.buyerAddress || '',
    ].filter(Boolean);
    const maxLines = Math.max(sellerLines.length, buyerLines.length);
    for(let i=0;i<maxLines;i++){
      if(sellerLines[i]) doc.text(sellerLines[i], colX1, y);
      if(buyerLines[i]) doc.text(buyerLines[i], colX2, y);
      y += 5;
    }

    y += 6;
    doc.setDrawColor(...berry);
    doc.line(marginL, y, marginR, y);
    y += 8;

    // table column right edges (Kiekis / Kaina / Suma are right-aligned to these)
    const descX = 18, qtyRightX = 142, priceRightX = 170, sumRightX = marginR - 2;

    doc.setFont('Roboto','bold');
    doc.setTextColor(255,255,255);
    doc.setFillColor(...berry);
    doc.rect(marginL, y-5.5, marginR-marginL, 8, 'F');
    doc.text('Prekė / paslauga', descX, y);
    doc.text('Kiekis', qtyRightX, y, {align:'right'});
    doc.text('Kaina', priceRightX, y, {align:'right'});
    doc.text('Suma', sumRightX, y, {align:'right'});
    y += 8;

    doc.setFont('Roboto','normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...choc);
    (invoice.lineItems||[]).forEach((item, i)=>{
      const desc = doc.splitTextToSize(item.description, 118);
      const rowHeight = Math.max(7, desc.length*4.8);
      if(y + rowHeight > 270){ doc.addPage(); y = 20; }
      if(i % 2 === 1){ doc.setFillColor(250,244,235); doc.rect(marginL, y-5, marginR-marginL, rowHeight, 'F'); }
      doc.text(desc, descX, y);
      doc.text(String(item.qty), qtyRightX, y, {align:'right'});
      doc.text(`${item.unitPrice.toFixed(2)} €`, priceRightX, y, {align:'right'});
      doc.text(`${item.total.toFixed(2)} €`, sumRightX, y, {align:'right'});
      y += rowHeight;
    });

    y += 4;
    doc.setDrawColor(...berry);
    doc.line(marginL, y, marginR, y);
    y += 9;
    doc.setFont('Roboto','bold');
    doc.setFontSize(13);
    doc.setTextColor(...berry);
    doc.text(`Iš viso mokėti: ${invoice.totalAmount.toFixed(2)} €`, marginR, y, {align:'right'});

    y += 16;
    if(invoice.orderNumber){
      doc.setFont('Roboto','normal');
      doc.setFontSize(9);
      doc.setTextColor(...chocSoft);
      doc.text(`Užsakymo Nr.: ${formatOrderNumber(invoice.orderNumber)}`, marginL, y);
    }

    return doc;
  }

  function generateInvoicePdf(invoice){
    const doc = buildInvoicePdfDoc(invoice);
    doc.save(`saskaita_${formatInvoiceNumber(invoice)}.pdf`);
  }

  function previewInvoicePdf(invoice){
    const doc = buildInvoicePdfDoc(invoice);
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }


  function generateGiftCouponPdf(coupon){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'mm', format:'a4'});
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_B64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_B64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    const berry=[184,53,95], choc=[59,42,40], chocSoft=[110,90,82], cream=[255,248,239];
    const pageW=210, pageH=297;
    const cardX=20, cardY=60, cardW=170, cardH=140;

    doc.setFillColor(...cream);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setDrawColor(...berry);
    doc.setLineWidth(1.2);
    doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, 'S');
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX+3, cardY+3, cardW-6, cardH-6, 4, 4, 'S');

    try{ doc.addImage(`data:image/png;base64,${LOGO_BASE64}`, 'PNG', pageW/2-15, cardY+10, 30, 30); }catch(e){}

    doc.setFont('Roboto','bold'); doc.setFontSize(20); doc.setTextColor(...berry);
    doc.text('DOVANŲ KUPONAS', pageW/2, cardY+52, {align:'center'});

    doc.setFont('Roboto','normal'); doc.setFontSize(11); doc.setTextColor(...chocSoft);
    doc.text('Šis kuponas suteikia teisę į nuolaidą', pageW/2, cardY+62, {align:'center'});

    doc.setFont('Roboto','bold'); doc.setFontSize(32); doc.setTextColor(...berry);
    doc.text(`${coupon.amount.toFixed(2)} €`, pageW/2, cardY+80, {align:'center'});

    doc.setDrawColor(...berry); doc.setLineWidth(0.3);
    doc.line(cardX+30, cardY+92, cardX+cardW-30, cardY+92);

    doc.setFont('Roboto','normal'); doc.setFontSize(10); doc.setTextColor(...chocSoft);
    doc.text('Kupono kodas', pageW/2, cardY+102, {align:'center'});
    doc.setFont('Roboto','bold'); doc.setFontSize(16); doc.setTextColor(...choc);
    doc.text(coupon.code, pageW/2, cardY+112, {align:'center'});

    doc.setFont('Roboto','normal'); doc.setFontSize(8.5); doc.setTextColor(...chocSoft);
    doc.text('Kodą įvesk užsakymo formoje, lauke „Turiu nuolaidos kodą, kuponą“.', pageW/2, cardY+126, {align:'center'});

    doc.save(`dovanu_kuponas_${coupon.code}.pdf`);
  }



  function quickStatusModalHtml(o){
    const pending = quickStatusPending || {status:o.status, paid:!!o.paid, isUrgent:!!o.isUrgent};
    return `<div class="overlay" id="quickStatusOverlay">
      <div class="modal" style="max-width:440px;position:relative;">
        <button type="button" class="modal-x-close" id="closeQuickStatusModal">×</button>
        <h2>Keisti užsakymo būseną</h2>
        <p class="combo-hint" style="margin-bottom:10px;">${escapeHtml(o.customerName||'Be vardo')}${o.orderNumber ? ` - Nr. ${formatOrderNumber(o.orderNumber)}` : ''}</p>
        <div class="status-row quick-status-row">
          ${STATUS_ORDER.map(s=>`<div class="status-btn ${pending.status===s?'current':''}" data-quick-status="${s}">${STATUS_LABELS_SHORT[s]}</div>`).join('')}
        </div>
        <div class="quick-status-actions">
          <button type="button" class="paid-toggle-btn ${pending.paid?'is-paid':'is-unpaid'}" id="quickPaidToggleBtn">Apmokėta</button>
          <button type="button" class="urgent-toggle-btn ${pending.isUrgent?'is-urgent':'is-normal'}" id="quickUrgentToggleBtn">${pending.isUrgent?'⚡ Skubus užsakymas':'Skubus užsakymas'}</button>
          ${pending.isUrgent ? `<button type="button" class="btn ${o.confirmEmailSent?'confirm-email-btn is-sent':'btn-ghost'} btn-block" id="quickSendConfirmEmailBtn" ${o.confirmEmailSent?'disabled':''}>${o.confirmEmailSent?'✓ Patvirtinimo el. laiškas išsiųstas':'✉️ Siųsti patvirtinimo el. laišką'}</button>` : ''}
          ${o.status==='laukia_patvirtinimo' ? `<button type="button" class="btn btn-primary btn-block confirm-order-btn" id="quickConfirmOrderBtn">✓ Patvirtinti užsakymą</button>` : ''}
          <button type="button" class="btn btn-ghost btn-block" id="editFullOrderBtn">⚙️ Redaguoti užsakymą</button>
          ${o.customerPhone ? `<div class="quick-contact-section">
            <button type="button" class="quick-contact-toggle" id="quickContactToggleBtn">
              <svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.9c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
              Susisiekti
            </button>
            ${quickContactExpanded ? `<div class="quick-contact-row">
              <a href="tel:${escapeAttr(o.customerPhone)}" class="quick-contact-btn" aria-label="Skambinti">
                <svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.9c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                Skambinti
              </a>
              <a href="sms:${escapeAttr(o.customerPhone)}" class="quick-contact-btn" aria-label="Rašyti SMS">
                <svg viewBox="0 0 24 24"><path d="M4 4h16a1 1 0 011 1v12a1 1 0 01-1 1H8l-4.7 3.6A.5.5 0 012.5 21V5a1 1 0 011-1z"/></svg>
                SMS
              </a>
            </div>` : ''}
          </div>` : ''}
          <button type="button" class="btn btn-ghost btn-block" id="quickDeleteOrderBtn" style="color:var(--muted-red);">🗑️ Ištrinti</button>
        </div>
      </div>
    </div>`;
  }


  function ticketCard(o){
    const dateStr = o.neededDate ? formatDate(o.neededDate) : 'Data nenurodyta';
    const largeBlock = formatUnitsBlock(o.largeCakes, 'Didelis tortas', 'Dideli tortai', 'tortas');
    const smallBlock = formatUnitsBlock(o.smallCakes, 'Mažas tortas', 'Maži tortai', 'tortas');
    const jarLargeBlock = formatJarSizeBlock(o.jarQtyLarge, o.jarLargeCombos, 'Didelis indelis', 'Dideli indeliai');
    const jarSmallBlock = formatJarSizeBlock(o.jarQtySmall, o.jarSmallCombos, 'Mažas indelis', 'Maži indeliai');

    const qtyBadges = [];
    if(o.largeCakes && o.largeCakes.length) qtyBadges.push(`<span class="qty-badge">${iconLargeCake()}${o.largeCakes.length}</span>`);
    if(o.smallCakes && o.smallCakes.length) qtyBadges.push(`<span class="qty-badge">${iconSmallCake()}${o.smallCakes.length}</span>`);
    if(o.jarQtyLarge) qtyBadges.push(`<span class="qty-badge">${iconLargeJar()}${o.jarQtyLarge}</span>`);
    if(o.jarQtySmall) qtyBadges.push(`<span class="qty-badge">${iconSmallJar()}${o.jarQtySmall}</span>`);

    const jarLargeExtrasLine = formatExtrasLineFor(o.jarLargeExtras,'Didelių');
    const jarSmallExtrasLine = formatExtrasLineFor(o.jarSmallExtras,'Mažų');
    const metaGroups = [];
    if(largeBlock) metaGroups.push(largeBlock);
    if(smallBlock) metaGroups.push(smallBlock);
    if(jarLargeBlock || jarLargeExtrasLine){
      metaGroups.push(
        jarLargeBlock +
        (jarLargeExtrasLine ? `<div class="ticket-meta">${jarLargeExtrasLine}</div>` : '')
      );
    }
    if(jarSmallBlock || jarSmallExtrasLine){
      metaGroups.push(
        jarSmallBlock +
        (jarSmallExtrasLine ? `<div class="ticket-meta">${jarSmallExtrasLine}</div>` : '')
      );
    }
    metaGroups.push(`<div class="ticket-meta"><b>Pristatymo būdas</b></div><div class="ticket-meta ticket-unit-line">${fulfillmentLabel(o.fulfillment) || 'Būdas nenurodytas'}</div>`);

    return `<div class="ticket" data-id="${o.id}">
      <div class="ticket-top">
        <div class="ticket-name">${escapeHtml(o.customerName || 'Be vardo')}${o.orderNumber ? `<span class="ticket-ordernum">Nr. ${formatOrderNumber(o.orderNumber)}</span>` : ''}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${o.isUrgent ? `<span class="urgent-badge" title="Skubus užsakymas">⚡ Skubus</span>` : ''}
          ${o.needsInvoice ? (
            invoices.find(inv=>inv.orderId===o.id)
              ? `<span class="invoice-needed-badge invoice-issued" title="Sąskaita faktūra išrašyta">🧾 SF</span>`
              : `<span class="invoice-needed-badge" title="Reikalinga sąskaita faktūra">🧾 SF</span>`
          ) : ''}
          <div class="stamp ${o.status}">${STATUS_LABELS_SHORT[o.status]}</div>
        </div>
      </div>
      <div class="ticket-meta ticket-date-line"><b>${dateStr}</b></div>
      ${metaGroups.join('<hr class="ticket-divider">')}
      ${qtyBadges.length ? `<hr class="ticket-divider"><div class="qty-row">${qtyBadges.join('')}</div>` : ''}
      <div class="perf"></div>
      <div class="ticket-bottom">
        <span class="paid-pill ${o.paid?'yes':'no'}">${o.paid ? 'Apmokėta' : 'Neapmokėta'}</span>
        <span class="ticket-bottom-right">
          ${o.customerPhone ? `<span class="phone-text">${iconPhone()}${escapeHtml(o.customerPhone)}</span>` : ''}
          <span class="price-text">${o.price ? o.price+' €' : ''}</span>
        </span>
      </div>
    </div>`;
  }


  function loginScreenHtml(){
    return `<div class="wrap customer-wrap">
      <div class="customer-logo-wrap">
        <img src="/logo.png" alt="Logotipas" class="customer-logo">
      </div>
      <div class="customer-form-card login-card">
        <h1 class="customer-title">Administravimas</h1>
        <p class="customer-ordernum">Prisijunk, kad tvarkytum užsakymus</p>
        <div class="field"><label>Slapyvardis arba el. paštas</label><input id="loginUser" autocomplete="username"></div>
        <div class="field"><label>Slaptažodis</label><input id="loginPass" type="password" autocomplete="current-password"></div>
        ${loginError ? `<p class="login-error">${escapeHtml(loginError)}</p>` : ''}
        <button type="button" class="btn btn-primary btn-block" id="loginBtn">Prisijungti</button>
      </div>
    </div>`;
  }


  function invoiceSectionForOrder(o){
    const existing = invoices.find(inv=>inv.orderId===o.id);
    if(existing){
      return `<div class="field" style="margin-top:14px;">
        <div class="invoice-issued-box">
          <span>Išrašyta sąskaita SF <b>${formatInvoiceNumber(existing)}</b> (${formatDate(existing.issueDate)}), suma <b>${existing.totalAmount.toFixed(2)} €</b></span>
          <button type="button" class="btn btn-ghost btn-sm" id="downloadInvoiceBtn" data-invoice-id="${existing.id}">Atsisiųsti PDF</button>
        </div>
      </div>`;
    }
    const expanded = !!modalOrder.needsInvoice;
    return `<div class="field" style="margin-top:14px;">
      <div class="checkrow"><input type="checkbox" id="invFormToggle" ${expanded?'checked':''}><label for="invFormToggle" style="margin:0;text-transform:none;font-weight:600;font-size:13px;color:var(--choc);">Sąskaita faktūra</label></div>
      ${expanded ? `
      <p class="combo-hint" style="margin:8px 0;">Įrašyk pirkėjo rekvizitus. Šie duomenys bus išsaugoti kartu su užsakymu, o sąskaitą faktūrą gali išrašyti bet kada.</p>
      <div class="field"><input type="text" id="invBuyerName" placeholder="Pirkėjo vardas, pavardė / įmonės pavadinimas" value="${escapeAttr(modalOrder.invBuyerName||'')}"></div>
      <div class="row2">
        <div class="field"><input type="text" id="invBuyerCode" placeholder="Įmonės / asmens kodas (nebūtina)" value="${escapeAttr(modalOrder.invBuyerCode||'')}"></div>
        <div class="field"><input type="text" id="invBuyerVat" placeholder="PVM kodas (nebūtina)" value="${escapeAttr(modalOrder.invBuyerVat||'')}"></div>
      </div>
      <div class="field"><input type="text" id="invBuyerAddress" placeholder="Adresas (nebūtina)" value="${escapeAttr(modalOrder.invBuyerAddress||'')}"></div>
      ${o.id ? `<button type="button" class="btn btn-primary btn-sm" id="issueInvoiceBtn">Išrašyti sąskaitą faktūrą</button>` : `<p class="combo-hint">Pirmiausia išsaugok užsakymą - tada galėsi išrašyti sąskaitą faktūrą.</p>`}
      ` : ''}
    </div>`;
  }


  function modalHtml(o){
    const isNew = !o.id;
    const largeCakes = o.largeCakes || [];
    const smallCakes = o.smallCakes || [];
    const autoPrice = computeOrderPrice(o);

    return `<div class="overlay" id="overlay">
      <div class="modal" style="position:relative;">
        <button class="modal-close" id="closeModal">×</button>
        <h2>${isNew ? 'Naujas užsakymas' : 'Redaguoti užsakymą'}</h2>
        ${o.orderNumber ? `<p class="combo-hint" style="margin-bottom:10px;">Užsakymo Nr. ${formatOrderNumber(o.orderNumber)}</p>` : ''}
        <div class="field"><label>Kliento vardas</label><input id="f_name" value="${escapeAttr(o.customerName||'')}"></div>
        <div class="field"><label>Telefono numeris</label><input id="f_phone" type="tel" value="${escapeAttr(o.customerPhone||'')}" placeholder="Pvz. +370 6xx xxxxx"></div>
        <div class="field"><label>El. pašto adresas</label><input id="f_email" type="email" value="${escapeAttr(o.customerEmail||'')}" placeholder="Pvz. vardas@paštas.lt"></div>
        <div class="field"><label>Data</label><input type="date" id="f_date" value="${o.neededDate||''}"></div>

        ${(o.flavor || o.colors) ? `<p class="combo-hint">Atpažinta iš žinutės - skoniai: ${escapeHtml(o.flavor||'-')}; spalvos: ${escapeHtml(o.colors||'-')}. Naudok tai kaip užuominą pasirenkant žemiau.</p>` : ''}

        <div class="field">
          <label>Užsakymų kiekis</label>
          <div class="row2">
            <div class="field"><label>Didelių tortų kiekis</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="f_qty_large" value="${largeCakes.length||''}"></div>
            <div class="field"><label>Mažų tortų kiekis</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="f_qty_small" value="${smallCakes.length||''}"></div>
          </div>
          <div class="row2">
            <div class="field"><label>Didelių indelių kiekis</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="f_qty_jar_large" value="${o.jarQtyLarge||''}"></div>
            <div class="field"><label>Mažų indelių kiekis</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="f_qty_jar_small" value="${o.jarQtySmall||''}"></div>
          </div>
        </div>

        ${(()=>{
          const groups = [];
          if(largeCakes.length) groups.push(`<div class="product-group-label">Didelis tortas</div>` + largeCakes.map((c,i)=>cakeUnitBlock(c,'large',i,`Didelis tortas #${i+1}`)).join(''));
          if(smallCakes.length) groups.push(`<div class="product-group-label">Mažas tortas</div>` + smallCakes.map((c,i)=>cakeUnitBlock(c,'small',i,`Mažas tortas #${i+1}`)).join(''));
          if(o.jarQtyLarge>0) groups.push(`<div class="product-group-label">Dideli indeliai</div>` + jarSizeBlock(o,'large'));
          if(o.jarQtySmall>0) groups.push(`<div class="product-group-label">Maži indeliai</div>` + jarSizeBlock(o,'small'));
          return groups.join('<hr class="product-divider">');
        })()}

        <div class="field" style="margin-top:14px;">
          <label>Pristatymo būdas</label>
          <select id="f_fulfillment">
            <option value="" ${!o.fulfillment?'selected':''}>-</option>
            ${orderSettings.pickupEnabled ? `<option value="atsiemimas" ${o.fulfillment==='atsiemimas'?'selected':''}>Atsiimsiu pats (Vilnius, Viršilų g. 11)</option>` : ''}
            ${orderSettings.deliveryVilniusEnabled ? `<option value="pristatymas" ${o.fulfillment==='pristatymas'?'selected':''}>Pristatymas Vilniuje${prices.delivery_vilnius?` (+${prices.delivery_vilnius.toFixed(2)} €)`:''}</option>` : ''}
            ${orderSettings.deliveryBusEnabled ? `<option value="autobusas" ${o.fulfillment==='autobusas'?'selected':''}>Siuntimas autobusu${prices.delivery_bus?` (+${prices.delivery_bus.toFixed(2)} €)`:''}</option>` : ''}
          </select>
          ${o.fulfillment && deliveryPriceFor(o.fulfillment) ? `<p class="combo-hint">Pristatymo kaina: ${deliveryPriceFor(o.fulfillment).toFixed(2)} €</p>` : ''}
        </div>
        ${o.fulfillment !== 'atsiemimas' ? `<div class="field"><label>Adresas / pastabos dėl pristatymo</label><textarea id="f_address">${escapeHtml(o.address||'')}</textarea></div>` : ''}
        <div class="field"><label>Papildomos pastabos</label><textarea id="f_notes">${escapeHtml(o.notes||'')}</textarea></div>

        <div class="field"><label>Kaina (€)</label><input id="f_price" value="${escapeAttr(o.price||'')}"></div>
        <div class="price-hint-row">
          <span>Apskaičiuota automatiškai: ${autoPrice.toFixed(2)} €</span>
          ${o.priceManual ? `<button type="button" class="price-auto-btn" id="resetAutoPrice">↺ Naudoti automatinę</button>` : ''}
        </div>

        <button type="button" class="paid-toggle-btn ${o.paid?'is-paid':'is-unpaid'}" id="f_paidToggleBtn" style="margin-top:4px;">Apmokėta</button>
        <button type="button" class="urgent-toggle-btn ${o.isUrgent?'is-urgent':'is-normal'}" id="f_urgentToggleBtn" style="margin-top:8px;">${o.isUrgent?'⚡ Skubus užsakymas':'Skubus užsakymas'}</button>
        ${o.isUrgent ? `<button type="button" class="btn ${o.confirmEmailSent?'confirm-email-btn is-sent':'btn-ghost'} btn-block" id="f_sendConfirmEmailBtn" style="margin-top:8px;" ${o.confirmEmailSent?'disabled':''}>${o.confirmEmailSent?'✓ Patvirtinimo el. laiškas išsiųstas':'✉️ Siųsti patvirtinimo el. laišką'}</button>` : ''}

        ${(!isNew && o.status==='laukia_patvirtinimo') ? `
        <div class="confirm-order-row">
          <button type="button" class="btn btn-primary btn-block confirm-order-btn" id="confirmOrderBtn">✓ Patvirtinti užsakymą</button>
          <p class="combo-hint" style="text-align:center;margin-top:6px;">Patvirtinus, klientui automatiškai bus išsiųstas laiškas su užsakymo informacija (jei jis paliko el. paštą).</p>
        </div>` : ''}

        ${!isNew ? `<div class="field" style="margin-top:14px;">
          <label>Būsena</label>
          <div class="status-row">
            ${STATUS_ORDER.map(s=>`<div class="status-btn ${o.status===s?'current':''}" data-status="${s}">${STATUS_LABELS_SHORT[s]}</div>`).join('')}
          </div>
        </div>` : ''}

        ${invoiceSectionForOrder(o)}

        ${o.rawMessage ? `<div class="field"><label>Originali žinutė</label><div class="raw-msg">${escapeHtml(o.rawMessage)}</div></div>` : ''}

        <div class="modal-actions">
          <button class="btn btn-primary" id="saveOrder">Išsaugoti</button>
          ${!isNew ? `<button class="btn btn-ghost" id="deleteOrder">Ištrinti</button>` : ''}
        </div>
      </div>
    </div>`;
  }

