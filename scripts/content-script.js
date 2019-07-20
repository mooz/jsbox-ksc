(function() {
  function log(message) {
    $notify("log", { message });
  }

  // Do not load in ifrmae pages
  if (window !== window.parent) {
    return;
  }

  function onLocationChange() {
    gLocalKeyMap = {
      view: Object.assign({}, globalKeyMap.view),
      rich: Object.assign({}, globalKeyMap.rich),
      edit: Object.assign({}, globalKeyMap.edit)
    };

    for (let { url, keymap, alias, style } of sites) {
      if (location.href.startsWith(url)) {
        if (keymap) {
          Object.assign(gLocalKeyMap.view, keymap.view || {});
          Object.assign(gLocalKeyMap.rich, keymap.rich || {});
          Object.assign(gLocalKeyMap.edit, keymap.edit || {});
        }
        var styleElement = document.createElement("style");
        document.head.appendChild(styleElement);
        styleElement.sheet.insertRule(style, 0);
        break;
      }
    }
  }

  let gLocalKeyMap = null;
  let gRichTextEditorInputElement = null;
  let gAceEditor = null;
  let gCodeMirror = null;
  let gGoogleDocsEditor = null;
  let gStatusMarked = false;
  var gHitHintDisposerInternal = null;

  const keyCodeMap = {
    CANCEL: 3,
    HELP: 6,
    BACK_SPACE: 8,
    TAB: 9,
    CLEAR: 12,
    RETURN: 13,
    ENTER: 14,
    SHIFT: 16,
    CONTROL: 17,
    ALT: 18,
    PAUSE: 19,
    CAPS_LOCK: 20,
    ESCAPE: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    PRINTSCREEN: 44,
    INSERT: 45,
    DELETE: 46,
    "0": 48,
    "1": 49,
    "2": 50,
    "3": 51,
    "4": 52,
    "5": 53,
    "6": 54,
    "7": 55,
    "8": 56,
    "9": 57,
    SEMICOLON: 59,
    EQUALS: 61,
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,
    CONTEXT_MENU: 93,
    NUMPAD0: 96,
    NUMPAD1: 97,
    NUMPAD2: 98,
    NUMPAD3: 99,
    NUMPAD4: 100,
    NUMPAD5: 101,
    NUMPAD6: 102,
    NUMPAD7: 103,
    NUMPAD8: 104,
    NUMPAD9: 105,
    MULTIPLY: 106,
    ADD: 107,
    SEPARATOR: 108,
    SUBTRACT: 109,
    DECIMAL: 110,
    DIVIDE: 111,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    F13: 124,
    F14: 125,
    F15: 126,
    F16: 127,
    F17: 128,
    F18: 129,
    F19: 130,
    F20: 131,
    F21: 132,
    F22: 133,
    F23: 134,
    F24: 135,
    NUM_LOCK: 144,
    SCROLL_LOCK: 145,
    COMMA: 188,
    PERIOD: 190,
    SLASH: 191,
    BACK_QUOTE: 192,
    OPEN_BRACKET: 219,
    BACK_SLASH: 220,
    CLOSE_BRACKET: 221,
    QUOTE: 222,
    META: 224,
    // Special Keys
    UIKEYINPUTUPARROW: 38,
    UIKEYINPUTDOWNARROW: 40,
    UIKEYINPUTLEFTARROW: 37,
    UIKEYINPUTRIGHTARROW: 39,
    ARROWUP: 38,
    ARROWDOWN: 40,
    ARROWLEFT: 37,
    ARROWRIGHT: 39
  };

  function hitHint(customSelector, customDisposer) {
    // Thanks to https://qiita.com/okayu_tar_gz/items/924481d4acf50be37618
    const settings = {
      elm: {
        allow: [
          "a",
          "button:not([disabled])",
          "details",
          'input:not([type="disabled" i]):not([type="hidden" i]):not([type="readonly" i])',
          "select:not([disabled])",
          "textarea:not([disabled]):not([readonly])",
          '[contenteditable=""]',
          '[contenteditable="true" i]',
          "[onclick]",
          "[onmousedown]",
          "[onmouseup]",
          '[role="button" i]',
          '[role="checkbox" i]',
          '[role="link" i]',
          '[role="menuitemcheckbox" i]',
          '[role="menuitemradio" i]',
          '[role="option" i]',
          '[role="radio" i]',
          '[role="switch" i]'
        ],
        block: []
      },
      hintCh: "asdfghjkl"
    };

    const clickableElms = [
      ...document.querySelectorAll(
        customSelector
          ? customSelector
          : settings.elm.allow.join(",") || undefined
      )
    ]
      .filter(
        elm => elm.closest(settings.elm.block.join(",") || undefined) === null
      )
      .map(elm => {
        const domRect = elm.getBoundingClientRect();

        return {
          bottom: Math.floor(domRect.bottom),
          elm: elm,
          height: Math.floor(domRect.height),
          left: Math.floor(domRect.left || domRect.x),
          right: Math.floor(domRect.right),
          top: Math.floor(domRect.top || domRect.y),
          width: Math.floor(domRect.width)
        };
      })
      .filter(data => {
        const windowH = window.innerHeight,
          windowW = window.innerWidth;

        return (
          data.width > 0 &&
          data.height > 0 &&
          data.bottom > 0 &&
          data.top < windowH &&
          data.right > 0 &&
          data.left < windowW
        );
      });

    function createTextHints(amount) {
      const hintKeys = settings.hintCh.toUpperCase();
      const hintKeysLength = hintKeys.length;
      var reverseHints = {};
      var numHints = 0;
      var uniqueOnly = true;

      function next(hint) {
        var l = hint.length;
        if (l === 0) {
          return hintKeys.charAt(0);
        }
        var p = hint.substr(0, l - 1);
        var n = hintKeys.indexOf(hint.charAt(l - 1)) + 1;
        if (n == hintKeysLength) {
          var np = next(p);
          if (uniqueOnly) {
            delete reverseHints[np];
            numHints--;
          }
          return np + hintKeys.charAt(0);
        } else {
          return p + hintKeys.charAt(n);
        }
      }
      var hint = "";
      while (numHints < amount) {
        hint = next(hint);
        reverseHints[hint] = true;
        numHints++;
      }
      var hints = [];
      for (let hint of Object.keys(reverseHints)) {
        hints.push(hint);
      }
      return hints;
    }

    const hints = createTextHints(clickableElms.length);

    const viewData = clickableElms
      .map((data, index) => {
        data.hintCh = hints[index];
        return data;
      })
      .map(data => {
        const hintElm = document.createElement("div");

        const style = hintElm.style;
        style.all = "initial";
        style.backgroundColor = "yellow";
        style.color = "black";
        style.fontFamily = "menlo";
        style.fontSize = "13px";
        style.left = `${data.left}px`;
        style.padding = "2px";
        style.position = "fixed";
        style.top = `${data.top}px`;
        style.opacity = 0.8;
        style.zIndex = "9999999";

        hintElm.textContent = data.hintCh;

        document.body.appendChild(hintElm);

        data.hintElm = hintElm;
        return data;
      });

    const fin = () => {
      gHitHintDisposerInternal = null;
      window.removeEventListener("keydown", onkeydown);
      viewData.forEach(data => {
        if (data.hintElm) {
          data.hintElm.remove();
        }
      });
      if (customDisposer) {
        customDisposer();
      }
    };

    let input = "";
    const onkeydown = e => {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey || e.shiftKey)) {
        e.preventDefault();

        if (e.key === "Escape" || (e.key === "g" && e.ctrlKey)) {
          fin();
        } else {
          input += e.key.toUpperCase();

          viewData
            .filter(data => !data.hintCh.startsWith(input))
            .forEach(data => {
              data.hintElm.remove();
            });

          const selectedElms = viewData.filter(data =>
            data.hintCh.startsWith(input)
          );

          if (selectedElms.length === 0) {
            fin();
            return;
          }

          if (selectedElms.length === 1 && selectedElms[0].hintCh === input) {
            let selectedElm = selectedElms[0].elm;
            selectedElm.focus();
            let ev = document.createEvent("HTMLEvents");
            ev.initEvent("click", true, false);
            selectedElm.dispatchEvent(ev);
            fin();
          }
        }
      }
    };

    gHitHintDisposerInternal = fin;
    window.addEventListener("keydown", onkeydown);
  }

  function keyToString(ev) {
    const modifiers = ["ctrl", "alt", "meta"];
    const modifierStrings = modifiers.reduce(
      (modifierStrings, modifier) =>
        ev[`${modifier}Key`]
          ? modifierStrings.concat([modifier])
          : modifierStrings,
      []
    );
    return modifierStrings.concat(ev.key).join("-");
  }

  function parseKeyString(compositeKeyString) {
    const modifierMapJS = new Map([
      ["ALT", "withAlt"],
      ["SHIFT", "withShift"],
      ["COMMAND", "withMeta"],
      ["META", "withMeta"],
      ["CTRL", "withCtrl"]
    ]);

    function keyStringToKeyCode(keyString) {
      if (keyCodeMap.hasOwnProperty(keyString)) {
        return keyCodeMap[keyString];
      } else {
        throw new Error("Unknown key: [" + keyString + "]");
      }
    }

    return compositeKeyString.split("-").reduce(
      (key, keyString) => {
        keyString = keyString.toUpperCase();
        if (modifierMapJS.has(keyString)) {
          key[modifierMapJS.get(keyString)] = true;
        } else {
          key.key = keyStringToKeyCode(keyString);
        }
        return key;
      },
      {
        key: null,
        withCtrl: false,
        withShift: false,
        withAlt: false,
        withMeta: false
      }
    );
  }

  function inEditorLikeMode() {
    let elem = document.activeElement;
    let tag = elem.tagName;
    // TODO: Check if "contentEditable" attribute is on
    return (
      tag === "TEXTAREA" ||
      tag === "INPUT" ||
      elem === gRichTextEditorInputElement
    );
  }

  const shortcutKeyHandler = keyEvent => {
    if (gHitHintDisposerInternal) {
      // Hit-Hint mode. Ignore.
      return;
    }

    if (keyEvent.__keepMark__) {
      return;
    }

    let mode = null;
    if (!inEditorLikeMode()) {
      mode = "view";
      log("View Mode");
    } else if (document.activeElement === gRichTextEditorInputElement) {
      mode = "rich";
      log("Rich Edit Mode");
    } else {
      mode = "edit";
      log("Normal Edit Mode");
    }

    let keepMark = false;
    if (mode) {
      const keyString = keyToString(keyEvent);
      let keyMap = gLocalKeyMap[mode];
      if (keyMap.hasOwnProperty(keyString)) {
        keyEvent.stopPropagation();
        keyEvent.preventDefault();

        let command = keyMap[keyString];

        // `key: XXX` is abbreviation of `key: { command: XXX, marked: false }`
        if (command.command) {
          keepMark = !!command.marked;
          command = command.command;
        }

        if (typeof command === "function") {
          // Exec function
          command();
        } else {
          // log(
          //   command + " / keepMark: " + keepMark + " / marked: " + gStatusMarked
          // );
          // Key remapping
          let eventInfo = parseKeyString(command);
          // log("Now dispatch " + JSON.stringify(eventInfo, null, 2));
          jsbox.dispatchKeydown(
            eventInfo.key,
            eventInfo.withShift,
            eventInfo.withCtrl,
            eventInfo.withAlt,
            eventInfo.withCommand,
            (keepMark = keepMark)
          );
        }
      }
    }
    if (!keepMark) {
      // Reset mark
      gStatusMarked = false;
    }
  };

  function setupInCompositionHandler(editorElement, dispatcher) {
    // Ctr+h should be handled separately.
    let inComposition = false;
    editorElement.addEventListener(
      "compositionstart",
      () => {
        inComposition = true;
      },
      false
    );
    editorElement.addEventListener(
      "compositionend",
      () => {
        inComposition = false;
      },
      false
    );
    editorElement.addEventListener(
      "keydown",
      keyEvent => {
        if (keyEvent.keyCode === 72 && keyEvent.key === "Backspace") {
          if (inComposition) {
            log("In composition. Ignore.");
          } else {
            keyEvent.stopPropagation();
            keyEvent.preventDefault();
            dispatcher();
          }
        }
      },
      false
    );
  }

  function initializeCodeMirror() {
    gCodeMirror = document.querySelector(".CodeMirror").CodeMirror;
    gRichTextEditorInputElement = gCodeMirror.display.input.getField();
    setupInCompositionHandler(gRichTextEditorInputElement, () =>
      jsbox.dispatchKeydown(8)
    );
    gRichTextEditorInputElement.style.cursor = "none";
  }

  function initializeOverleaf() {
    gAceEditor = window._debug_editors[window._debug_editors.length - 1];
    gRichTextEditorInputElement = document.querySelector(".ace_text-input");
    setupInCompositionHandler(gRichTextEditorInputElement, () => {
      jsbox.dispatchKeydown(8, false, true);
    });

    let scrollAmount = 300;
    let fileTreeToolbar = $(".file-tree .toolbar-right");
    let fileList = $(".file-tree ul.file-tree-list");

    fileTreeToolbar.append(
      $(`<a href=""><i class="fa fa-fw fa-arrow-up" /></a>`).on("click", () =>
        fileList.scrollTop(fileList.scrollTop() - scrollAmount)
      )
    );
    fileTreeToolbar.append(
      $(`<a href=""><i class="fa fa-fw fa-arrow-down" /></a>`).on("click", () =>
        fileList.scrollTop(fileList.scrollTop() + scrollAmount)
      )
    );
  }

  function initializeScrapbox() {
    gRichTextEditorInputElement = document.getElementById("text-input");
    setupInCompositionHandler(gRichTextEditorInputElement, ev =>
      jsbox.dispatchKeydown(8)
    );
    // Last URL saver
    let lastUrl = "";
    const titleObserver = new MutationObserver(records => {
      for (const record of records) {
        if (lastUrl !== location.href) {
          lastUrl = location.href;
          $notify("urlDidChange", { url: location.href });
          onLocationChange();
        }
      }
    });
    const title = document.querySelector("head title");
    titleObserver.observe(title, { childList: true });
  }

  function initializeRichTextEditor(trialTimes) {
    if (document.querySelector(".CodeMirror")) {
      log("Code mirror Initialized.");
      initializeCodeMirror();
    } else if (
      location.host === "scrapbox.io" &&
      document.getElementById("text-input")
    ) {
      // Scrapbox
      log("Scrapbox Initialized.");
      initializeScrapbox();
    } else if (
      window._debug_editors &&
      document.querySelector(".file-tree ul.file-tree-list") &&
      document.querySelector(".ace_text-input")
    ) {
      // Overleaf v2 provides access to ACE editor instance as `window._debug_editors`.
      // See https://www.overleaf.com/learn/how-to/How_can_I_define_custom_Vim_macros_in_a_vimrc_file_on_Overleaf%3F
      initializeOverleaf();
      log("Overleaf initialized");
    } else if (document.querySelector(".editor__inner")) {
      gRichTextEditorInputElement = document.querySelector(".editor__inner");
    } else if (document.querySelector(".docs-texteventtarget-iframe")) {
      gRichTextEditorInputElement = document.querySelector(
        ".docs-texteventtarget-iframe"
      );
      gGoogleDocsEditor = gRichTextEditorInputElement.contentWindow.document.querySelector(
        '[contenteditable="true"]'
      );
      gGoogleDocsEditor.addEventListener(
        "keydown",
        ev => shortcutKeyHandler(ev),
        true
      );
    } else {
      trialTimes++;
      if (trialTimes < 10) {
        setTimeout(() => {
          initializeRichTextEditor(trialTimes);
        }, 500);
        return;
      }
    }
  }

  function getKeyEventReceiver() {
    let element =
      gGoogleDocsEditor || document.activeElement || document.documentElement;
    return element;
  }

  var jsbox = {
    setMark: function() {
      gStatusMarked = true;
    },
    dispatchKeydown: function(
      keyCode,
      withShift = false,
      withCtrl = false,
      withAlt = false,
      withCommand = false,
      keepMark = false
    ) {
      let ev = document.createEvent("Event");
      ev.initEvent("keydown", true, true);
      ev.__keepMark__ = keepMark;
      ev.keyCode = keyCode;
      ev.which = keyCode;
      ev.shiftKey = withShift;
      if (keepMark && gStatusMarked) {
        ev.shiftKey = true;
      }
      ev.ctrlKey = withCtrl;
      ev.altKey = withAlt;
      ev.metaKey = withCommand;

      // log(`Dispatch ${keyEventToString(ev)}`);

      getKeyEventReceiver().dispatchEvent(ev);
    },
    get hitHintDisposer() {
      return gHitHintDisposerInternal;
    },
    doubleClick: function() {
      const dclEvent = new MouseEvent("dblclick", {
        bubbles: true,
        cancelable: true,
        view: window
      });
      document.activeElement.dispatchEvent(dclEvent);
    },
    getSelectedText: function() {
      if (gAceEditor) {
        return gAceEditor.getSelectedText();
      } else if (gCodeMirror) {
        return gCodeMirror.getSelection();
      } else {
        let selection = window.getSelection().toString();
        return window.getSelection().toString();
      }
    },
    insertText: function(text, escaped = false) {
      if (escaped) {
        text = unescape(text);
      }
      if (gAceEditor) {
        gAceEditor.insert(text);
      } else if (gCodeMirror) {
        gCodeMirror.replaceSelection(text);
      } else if (document.activeElement.contentWindow) {
        let doc = document;
        doc = document.activeElement.contentWindow.document;
        doc.execCommand("insertText", false, text);
      } else {
        document.execCommand("insertText", false, text);
      }
    },
    escape: function() {
      if (gStatusMarked) {
        gStatusMarked = false;
      } else {
        document.activeElement.blur();
        document.documentElement.focus();
      }
    },
    recenter: function() {
      if (gAceEditor) {
        gAceEditor.centerSelection();
      } else if (gCodeMirror) {
        var pos = gCodeMirror.cursorCoords(null, "local");
        gCodeMirror.scrollTo(
          null,
          (pos.top + pos.bottom) / 2 -
            gCodeMirror.getScrollInfo().clientHeight / 2
        );
      } else if (document.querySelector(".cursor")) {
        var $target = $(".cursor");
        var offset = $target.offset() || { top: 0, left: 0 };
        var outerHeight = $target.outerHeight();
        $(window).scrollTop(
          offset.top - (window.innerHeight - outerHeight) / 2
        );
      }
    },
    scrollDown: function() {
      window.scrollBy(0, 150);
    },
    scrollUp: function() {
      window.scrollBy(0, -150);
    },
    scrollPageDown: function() {
      window.scrollBy(0, 500);
    },
    scrollPageUp: function() {
      window.scrollBy(0, -500);
    },
    back: function() {
      history.back();
    },
    forward: function() {
      history.forward();
    },
    focusFirstInput: function() {
      jsbox.focusFirstInput();
    },
    cursorBottom: function() {
      window.scrollTo(0, document.body.scrollHeight);
    },
    cursorTop: function() {
      window.scrollTo(0, 0);
    },
    focusEditor: function() {
      // insert mode
      if (gGoogleDocsEditor) {
        gGoogleDocsEditor.focus();
      } else if (gRichTextEditorInputElement) {
        gRichTextEditorInputElement.focus();
      } else {
        jsbox.focusFirstInput();
      }
    },
    toggleHitHint: function() {
      if (jsbox.hitHintDisposer) {
        jsbox.hitHintDisposer();
      } else {
        jsbox.startHitHint();
      }
    },
    startHitHint: function() {
      return hitHint();
    },
    focusFirstInput: function() {
      let elements = Array.from(
        document.querySelectorAll(
          "input[type=text], input[type=search], input[type=password], textarea, textbox"
        )
      );
      elements.some(element => {
        // Check if the element is visible
        if (element.offsetParent !== null) {
          element.focus();
          return true;
        }
      });
    },
    paste: () => $notify("paste"),
    killLine: () => $notify("killLine"),
    killRegion: () => $notify("killRegion"),
    copyRegion: () => $notify("copyRegion"),
    startSiteSelector: () => {
      let popup = document.getElementById("jsbox-popup");

      if (popup) {
        popup.style.display = "block";
      } else {
        popup = document.createElement("div");
        popup.setAttribute("id", "jsbox-popup");
        popup.setAttribute(
          "style",
          `
        display: block !important;
        font-family: monospace !important;
        position: fixed !important;
        top: 10% !important;
        left: 10% !important;
        padding: 1em !important;
        width: 80% !important;
        height: 80% !important;
        background: black !important;
        font-size: 15px !important;
        opacity: 0.9 !important;
        border: 1px solid black !important; 
        border-radius: 1ex !important;
        z-index: 99990  !important;
        `
        );
        sites.forEach(site => {
          let link = document.createElement("a");
          link.setAttribute("href", site.url);
          link.setAttribute(
            "style",
            `
            display: block !important;
            color: white !important;
            padding: 0.5em 2em !important;
            border-bottom: 1px solid white !important;
            `
          );
          link.textContent = site.alias + " (" + site.url + ")";
          popup.appendChild(link);
        });
        document.documentElement.appendChild(popup);
      }

      hitHint(`#jsbox-popup a`, () => {
        popup.style.display = "none";
      });
    }
  };
  window.jsbox = jsbox;

  let exports = {};

  /*@preserve SETTINGS_HERE*/

  initializeRichTextEditor(0);
  window.addEventListener(
    "keydown",
    ev => {
      try {
        shortcutKeyHandler(ev);
      } catch (x) {
        log("Error in shortcutKeyHandler: " + x);
      }
    },
    true
  );
  onLocationChange();
})();
