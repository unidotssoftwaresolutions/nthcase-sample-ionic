/** A templated id, as the JSON writes it ("shop_item_{id}"), and the function that fills it in. */
function templated(template: string): ((value: number | string) => string) & { template: string } {
  return Object.assign((value: number | string) => template.replace(/\{\w+\}/, String(value)), { template });
}

/** A template with two placeholders ("lobby_row_{n}_tile_{m}"), filled in order. */
function templated2(template: string): ((a: number | string, b: number | string) => string) & { template: string } {
  return Object.assign(
    (a: number | string, b: number | string) => template.replace(/\{\w+\}/, String(a)).replace(/\{\w+\}/, String(b)),
    { template },
  );
}

/** A board cell's id: the column letter in lower case, then the row number ("lobby_board_cell_m18"). */
const boardCell = Object.assign(
  (col: number, row: number) => `lobby_board_cell_${String.fromCharCode(96 + col)}${row}`,
  { template: 'lobby_board_cell_{col}{row}' },
);

/**
 * Every test id of the app, from nthcase/test-ids.json (SPEC.md §7). Each one is the HTML `id` and `data-testid` of
 * the element a person acts on, so Appium finds it in the WEBVIEW context as `#shop_search` or `[data-testid=…]`.
 * The care guide's `web_*` ids live in public/care-guide.html, not here. The Gift cards screen has none, by design.
 * `lab_lobby_views` is not here either: only Android and iOS build the Lobby twice (SPEC.md §7).
 */
export const T = {
  navShop: 'nav_shop',
  navCart: 'nav_cart',
  navLab: 'nav_lab',
  navSettings: 'nav_settings',
  topBarTitle: 'top_bar_title',
  topBarBack: 'top_bar_back',
  snackbar: 'snackbar',
  snackbarText: 'snackbar_text',
  snackbarAction: 'snackbar_action',
  dialog: 'dialog',
  dialogTitle: 'dialog_title',
  dialogText: 'dialog_text',
  dialogConfirm: 'dialog_confirm',
  dialogDismiss: 'dialog_dismiss',

  signinScreen: 'signin_screen',
  signinEmail: 'signin_email',
  signinPassword: 'signin_password',
  signinPasswordToggle: 'signin_password_toggle',
  signinSubmit: 'signin_submit',
  signinError: 'signin_error',
  signinTestAccount: 'signin_test_account',
  signinUseTestAccount: 'signin_use_test_account',

  shopScreen: 'shop_screen',
  shopSearch: 'shop_search',
  shopSearchClear: 'shop_search_clear',
  shopCount: 'shop_count',
  shopList: 'shop_list',
  shopItem: templated('shop_item_{id}'),
  shopLoading: 'shop_loading',
  shopError: 'shop_error',
  shopRetry: 'shop_retry',
  shopEmpty: 'shop_empty',
  shopEmptyAction: 'shop_empty_action',

  itemScreen: 'item_screen',
  itemImage: 'item_image',
  itemNumber: 'item_number',
  itemName: 'item_name',
  itemPrice: 'item_price',
  itemDescription: 'item_description',
  itemQtyDecrease: 'item_qty_decrease',
  itemQtyValue: 'item_qty_value',
  itemQtyIncrease: 'item_qty_increase',
  itemAddToCart: 'item_add_to_cart',
  itemNotFound: 'item_not_found',
  itemNotFoundAction: 'item_not_found_action',

  cartScreen: 'cart_screen',
  cartList: 'cart_list',
  cartLine: templated('cart_line_{id}'),
  cartLineDecrease: templated('cart_line_decrease_{id}'),
  cartLineQty: templated('cart_line_qty_{id}'),
  cartLineIncrease: templated('cart_line_increase_{id}'),
  cartLineRemove: templated('cart_line_remove_{id}'),
  cartLineTotal: templated('cart_line_total_{id}'),
  cartTotal: 'cart_total',
  cartCheckout: 'cart_checkout',
  cartEmpty: 'cart_empty',
  cartEmptyAction: 'cart_empty_action',

  labScreen: 'lab_screen',
  labForm: 'lab_form',
  labGestures: 'lab_gestures',
  labWebview: 'lab_webview',
  labSlow: 'lab_slow',
  labOrders: 'lab_orders',
  labGiftCards: 'lab_gift_cards',
  labLobby: 'lab_lobby',

  lobbyScreen: 'lobby_screen',
  lobbyTouchLog: 'lobby_touch_log',
  lobbyTouchCount: 'lobby_touch_count',
  lobbyTouchReset: 'lobby_touch_reset',
  lobbySavedDelay: 'lobby_saved_delay',
  lobbySavedDelayChoice: templated('lobby_saved_delay_{s}'),
  lobbyPagerShown: 'lobby_pager_shown',
  lobbyPager: 'lobby_pager',
  lobbyBanner: templated('lobby_banner_{n}'),
  lobbyPagerPosition: 'lobby_pager_position',
  lobbyPagerAuto: 'lobby_pager_auto',
  lobbyTopRowPosition: 'lobby_top_row_position',
  lobbyTopRow: 'lobby_top_row',
  lobbyTopRowTile: templated('lobby_top_row_tile_{m}'),
  lobbyPage: 'lobby_page',
  lobbyChips: 'lobby_chips',
  lobbyChip: templated('lobby_chip_{n}'),
  lobbyRow: templated('lobby_row_{n}'),
  lobbyRowPosition: templated('lobby_row_{n}_position'),
  lobbyRowTile: templated2('lobby_row_{n}_tile_{m}'),
  lobbyGrid: 'lobby_grid',
  lobbyGridCell: templated('lobby_grid_cell_{n}'),
  lobbyInnerList: 'lobby_inner_list',
  lobbyInnerRow: templated('lobby_inner_row_{n}'),
  lobbyBoard: 'lobby_board',
  lobbyBoardPosition: 'lobby_board_position',
  lobbyBoardCell: boardCell,
  lobbyFooter: 'lobby_footer',
  lobbyBar: 'lobby_bar',
  lobbyBarHome: 'lobby_bar_home',
  lobbyBarLive: 'lobby_bar_live',
  lobbyBarSaved: 'lobby_bar_saved',
  lobbyBarOffers: 'lobby_bar_offers',
  lobbySavedScreen: 'lobby_saved_screen',
  lobbyDetail: 'lobby_detail',
  lobbyDetailBack: 'lobby_detail_back',
  lobbyPromo: 'lobby_promo',
  lobbyPromoBack: 'lobby_promo_back',
  lobbySheet: 'lobby_sheet',
  lobbySheetTitle: 'lobby_sheet_title',
  lobbySheetOpen: 'lobby_sheet_open',
  lobbySheetPreview: 'lobby_sheet_preview',
  lobbySheetSaved: 'lobby_sheet_saved',
  lobbySheetRate: 'lobby_sheet_rate',

  formScreen: 'form_screen',
  formName: 'form_name',
  formNameError: 'form_name_error',
  formEmail: 'form_email',
  formEmailError: 'form_email_error',
  formAge: 'form_age',
  formAgeError: 'form_age_error',
  formPassword: 'form_password',
  formPasswordToggle: 'form_password_toggle',
  formPasswordError: 'form_password_error',
  formCategory: 'form_category',
  formCategoryError: 'form_category_error',
  formCategoryOption: templated('form_category_option_{key}'),
  formDate: 'form_date',
  formDateError: 'form_date_error',
  formDatePicker: 'form_date_picker',
  formDateConfirm: 'form_date_confirm',
  formDateCancel: 'form_date_cancel',
  formNewsletter: 'form_newsletter',
  formBudget: 'form_budget',
  formBudgetValue: 'form_budget_value',
  formTerms: 'form_terms',
  formTermsError: 'form_terms_error',
  formSubmit: 'form_submit',
  formResult: 'form_result',

  gesturesScreen: 'gestures_screen',
  gesturesStatus: 'gestures_status',
  gesturesOrientation: 'gestures_orientation',
  gesturesTap: 'gestures_tap',
  gesturesTapCount: 'gestures_tap_count',
  gesturesDoubleTap: 'gestures_double_tap',
  gesturesLongPress: 'gestures_long_press',
  gesturesSwipe: 'gestures_swipe',
  gesturesDragSource: 'gestures_drag_source',
  gesturesDropTarget: 'gestures_drop_target',
  gesturesPinch: 'gestures_pinch',
  gesturesZoomValue: 'gestures_zoom_value',
  gesturesRotate: 'gestures_rotate',
  gesturesRotationValue: 'gestures_rotation_value',
  gesturesScroll: 'gestures_scroll',
  gesturesScrollTarget: 'gestures_scroll_target',

  webviewScreen: 'webview_screen',
  webview: 'webview',
  webviewStatus: 'webview_status',

  slowScreen: 'slow_screen',
  slowLoading: 'slow_loading',
  slowContent: 'slow_content',
  slowSlot: templated('slow_slot_{n}'),
  slowReload: 'slow_reload',

  ordersScreen: 'orders_screen',
  ordersLoading: 'orders_loading',
  ordersEmpty: 'orders_empty',
  ordersEmptyAction: 'orders_empty_action',
  ordersError: 'orders_error',
  ordersRetry: 'orders_retry',
  ordersList: 'orders_list',
  ordersRow: templated('orders_row_{n}'),

  settingsScreen: 'settings_screen',
  settingsAccountEmail: 'settings_account_email',
  settingsOrders: 'settings_orders',
  settingsSignOut: 'settings_sign_out',
  settingsTheme: 'settings_theme',
  settingsThemeSystem: 'settings_theme_system',
  settingsThemeLight: 'settings_theme_light',
  settingsThemeDark: 'settings_theme_dark',
  settingsNotifications: 'settings_notifications',
  settingsNotificationsStatus: 'settings_notifications_status',
  settingsSendNotification: 'settings_send_notification',
  settingsSlowLoading: 'settings_slow_loading',
  settingsFailLoading: 'settings_fail_loading',
  settingsReset: 'settings_reset',
  settingsResetConfirm: 'settings_reset_confirm',
  settingsResetCancel: 'settings_reset_cancel',
  settingsVersion: 'settings_version',
} as const;

/** `id` and `data-testid` together: spread onto the element that carries the id. */
export function tid(id: string): { id: string; 'data-testid': string } {
  return { id, 'data-testid': id };
}

/**
 * The ids as the JSON writes them: plain ids as they are, templates with their placeholder. The id census compares
 * this list with nthcase/test-ids.json, so an id cannot be added or dropped on one side only.
 */
export function idTemplates(): string[] {
  return Object.values(T).map((value) => (typeof value === 'string' ? value : value.template));
}
