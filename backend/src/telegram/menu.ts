import { Markup } from 'telegraf';

/**
 * Generates the persistent main menu layout using InlineKeyboardMarkup.
 * Users will navigate the bot primarily via these button clicks.
 */
export function getMainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📢 Latest Advisories', 'menu_advisories'),
      Markup.button.callback('💡 Integration FAQs', 'menu_faqs')
    ],
    [
      Markup.button.callback('🧾 Check QRPH Invoice', 'menu_lookup_invoice'),
      Markup.button.callback('🔍 Universal Search', 'menu_universal_search')
    ]
  ]);
}