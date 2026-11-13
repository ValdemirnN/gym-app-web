// Alert.alert / Alert.prompt não funcionam no react-native-web (são no-ops).
// Este shim cria um diálogo de verdade no navegador, com o mesmo formato de botões do app nativo.
import { Alert } from 'react-native';

const STYLE_ID = 'rn-alert-shim-style';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
  .rnas-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:2147483647;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  .rnas-box{background:#1F2937;color:#F9FAFB;border-radius:16px;width:100%;max-width:340px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
  .rnas-title{font-size:17px;font-weight:700;margin:0 0 8px}
  .rnas-msg{font-size:14px;line-height:1.45;color:#D1D5DB;margin:0 0 16px;white-space:pre-wrap;word-break:break-word}
  .rnas-input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #374151;background:#111827;color:#F9FAFB;font-size:16px;margin:0 0 16px;outline:none}
  .rnas-btns{display:flex;flex-direction:column;gap:8px}
  .rnas-btns.row{flex-direction:row}
  .rnas-btn{flex:1;padding:11px 12px;border-radius:10px;border:0;background:#374151;color:#F9FAFB;font-size:15px;font-weight:600;cursor:pointer}
  .rnas-btn.destructive{background:#DC2626}
  .rnas-btn.default{background:#10B981;color:#fff}
  .rnas-btn.cancel{background:transparent;border:1px solid #4B5563;color:#D1D5DB}
  `;
  document.head.appendChild(st);
}

function show({ title, message, buttons, cancelable, onDismiss, input }) {
  ensureStyle();
  const overlay = document.createElement('div');
  overlay.className = 'rnas-overlay';
  overlay.setAttribute('role', 'alertdialog');
  const box = document.createElement('div');
  box.className = 'rnas-box';
  overlay.appendChild(box);

  if (title) {
    const t = document.createElement('p');
    t.className = 'rnas-title';
    t.textContent = String(title);
    box.appendChild(t);
  }
  if (message) {
    const m = document.createElement('p');
    m.className = 'rnas-msg';
    m.textContent = String(message);
    box.appendChild(m);
  }
  let inputEl = null;
  if (input) {
    inputEl = document.createElement('input');
    inputEl.className = 'rnas-input';
    inputEl.value = input.defaultValue ?? '';
    if (input.keyboardType === 'numeric') inputEl.inputMode = 'numeric';
    box.appendChild(inputEl);
  }

  const list = buttons && buttons.length ? buttons : [{ text: 'OK' }];
  const wrap = document.createElement('div');
  wrap.className = 'rnas-btns' + (list.length === 2 ? ' row' : '');
  box.appendChild(wrap);

  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && cancelable !== false) {
      close();
      onDismiss && onDismiss();
    }
  };
  document.addEventListener('keydown', onKey, true);

  list.forEach((b) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'rnas-btn ' + (b.style || 'default');
    el.textContent = b.text || 'OK';
    el.onclick = () => {
      close();
      if (b.onPress) b.onPress(inputEl ? inputEl.value : undefined);
    };
    wrap.appendChild(el);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && cancelable !== false) {
      close();
      onDismiss && onDismiss();
    }
  });

  document.body.appendChild(overlay);
  if (inputEl) inputEl.focus();
  else wrap.lastChild && wrap.lastChild.focus();
}

Alert.alert = (title, message, buttons, options) => {
  show({
    title,
    message,
    buttons,
    cancelable: options?.cancelable,
    onDismiss: options?.onDismiss,
  });
};

Alert.prompt = (title, message, callbackOrButtons, type, defaultValue, keyboardType) => {
  const buttons =
    typeof callbackOrButtons === 'function'
      ? [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'OK', style: 'default', onPress: callbackOrButtons },
        ]
      : callbackOrButtons;
  show({ title, message, buttons, input: { defaultValue, keyboardType } });
};
