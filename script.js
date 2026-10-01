(function () {
  'use strict';

  /* settings for messages */
  var MESSAGE_MIN = 20;
  var MESSAGE_MAX = 300;
  var WARN_RATIO = 0.9;

  /* Phone number is stored reversed so it isn't sitting in the page HTML for scrapers.
     It is only assembled when a visitor clicks "Show phone number". */
  var PHONE_REVERSED = '740 000 334 16+';

  var QUOTES = [
    { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
    { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
    { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
    { text: 'Simplicity is prerequisite for reliability.', author: 'Edsger W. Dijkstra' },
    { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
    { text: 'The only way to learn a new programming language is by writing programs in it.', author: 'Dennis Ritchie' },
    { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
    { text: 'The most effective debugging tool is still careful thought, coupled with judiciously placed print statements.', author: 'Brian Kernighan' },
    { text: 'It always seems impossible until it\u2019s done.', author: 'Nelson Mandela' }
  ];

  /* helpers */
  function $(selector, context) {
    return (context || document).querySelector(selector);
  }
  function $$(selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  }
  // CSS Restart
  function replayAnimation(el, className) {
    el.classList.remove(className);
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add(className);
  }
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function initTerminalTyping() {
    var body = $('#termBody');
    if (!body || prefersReducedMotion()) return;

    var lines = $$('.term-line', body);
    var cursor = $('.cursor', body);
    if (lines.length < 2 || !cursor) return;

    var closingLine = lines[lines.length - 1];
    var steps = lines.slice(0, -1).map(function (line) {
      var isCommand = line.getAttribute('data-type') === 'cmd';
      var target = isCommand ? $('.term-text', line) : line;
      line.classList.add('is-pending');
      return { line: line, target: target, text: target.textContent, isCommand: isCommand };
    });
    closingLine.classList.add('is-pending');
    cursor.classList.add('is-typing');

    function render(target, text, n) {
      target.textContent = text.slice(0, n);
      target.appendChild(cursor);
      var rest = document.createElement('span');
      rest.className = 'term-rest';
      rest.textContent = text.slice(n);
      target.appendChild(rest);
    }

    function finish() {
      closingLine.appendChild(cursor);
      closingLine.classList.remove('is-pending');
      cursor.classList.remove('is-typing');
    }

    function run(i) {
      if (i >= steps.length) { finish(); return; }
      var step = steps[i];

      if (!step.isCommand) {
        // command "executes", then its output appears in one go
        setTimeout(function () {
          step.line.classList.remove('is-pending');
          setTimeout(function () { run(i + 1); }, 300);
        }, 250);
        return;
      }

      var n = 0;
      step.line.classList.remove('is-pending');
      render(step.target, step.text, 0);
      (function tick() {
        n++;
        render(step.target, step.text, n);
        if (n < step.text.length) {
          setTimeout(tick, 45 + Math.random() * 55);
        } else {
          step.target.textContent = step.text; // finalise (also detaches the cursor)
          setTimeout(function () { run(i + 1); }, 350);
        }
      })();
    }

    setTimeout(function () { run(0); }, 500);
  }

  function initQuoteGenerator() {
    var textEl = $('#quoteText');
    var authorEl = $('#quoteAuthor');
    var button = $('#newQuoteBtn');
    if (!textEl || !authorEl) return;

    var body = textEl.closest('.quote-body');
    var lastIndex = -1;

    function pickQuote() {
      var index;
      do {
        index = Math.floor(Math.random() * QUOTES.length);
      } while (index === lastIndex && QUOTES.length > 1);
      lastIndex = index;
      return QUOTES[index];
    }

    function showQuote(animate) {
      var quote = pickQuote();
      textEl.textContent = '\u201C' + quote.text + '\u201D';
      authorEl.textContent = '\u2014 ' + quote.author;
      if (animate && body) replayAnimation(body, 'quote-fade');
    }

    showQuote(false);
    if (button) {
      button.addEventListener('click', function () {
        showQuote(true);
      });
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var buffer = document.createElement('textarea');
      buffer.value = text;
      buffer.setAttribute('readonly', '');
      buffer.className = 'clipboard-buffer';
      document.body.appendChild(buffer);
      buffer.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(buffer);
      if (ok) { resolve(); } else { reject(new Error('copy failed')); }
    });
  }

  function initContactForm() {
    var form = $('#contactForm');
    if (!form) return;

    var inputs = {
      name: $('#name'),
      email: $('#email'),
      message: $('#message')
    };
    var errorEls = {
      name: $('#nameError'),
      email: $('#emailError'),
      message: $('#messageError')
    };
    var statusEl = $('#formStatus');
    var copyBtn = $('#copyBtn');
    var recipient = (form.getAttribute('action') || '').replace(/^mailto:/i, '');
    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var touched = { name: false, email: false, message: false };

    // error message for validation
    var validators = {
      name: function (value) {
        value = value.trim();
        if (!value) return 'Enter your name.';
        if (value.length < 2) return 'Your name needs at least 2 characters.';
        return '';
      },
      email: function (value) {
        value = value.trim();
        if (!value) return 'Enter your email address.';
        if (!EMAIL_PATTERN.test(value)) return 'That email isn\u2019t in the right format. Try name@example.com.';
        return '';
      },
      message: function (value) {
        var length = value.trim().length;
        if (!length) return 'Write a message.';
        if (length < MESSAGE_MIN) {
          var missing = MESSAGE_MIN - length;
          return 'Message is too short. Add ' + missing + ' more character' + (missing === 1 ? '' : 's') + ' (minimum ' + MESSAGE_MIN + ').';
        }
        return '';
      }
    };

    function showFieldState(field, message) {
      var input = inputs[field];
      errorEls[field].textContent = message;
      input.classList.toggle('has-error', message !== '');
      input.classList.toggle('is-ok', message === '' && input.value.trim() !== '');
      input.setAttribute('aria-invalid', message !== '' ? 'true' : 'false');
    }

    function validateField(field) {
      var message = validators[field](inputs[field].value);
      showFieldState(field, message);
      return message === '';
    }

    function showStatus(type, message) {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.className = 'form-status form-status-' + type;
      statusEl.hidden = false;
    }
    function clearStatus() {
      if (statusEl) statusEl.hidden = true;
    }

    // Validates every field; returns true if the form is ready to send/copy.
    function validateAll() {
      var firstInvalid = null;
      Object.keys(inputs).forEach(function (field) {
        touched[field] = true;
        if (!validateField(field) && !firstInvalid) firstInvalid = inputs[field];
      });
      if (firstInvalid) {
        showStatus('error', 'Fix the highlighted fields, then try again.');
        firstInvalid.focus();
        return false;
      }
      return true;
    }

    function buildMessage() {
      var name = inputs.name.value.trim();
      return {
        name: name,
        subject: 'Portfolio enquiry from ' + name,
        body: inputs.message.value.trim() + '\n\n\u2014 ' + name + ' (' + inputs.email.value.trim() + ')'
      };
    }

    Object.keys(inputs).forEach(function (field) {
      inputs[field].addEventListener('blur', function () {
        touched[field] = true;
        validateField(field);
      });
      inputs[field].addEventListener('input', function () {
        if (touched[field]) validateField(field);
        clearStatus();
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!validateAll()) return;

      var msg = buildMessage();
      // Honest wording: a mailto: link can only *try* to open the visitor's mail app.
      showStatus('success', 'Opening your email app\u2026 If nothing opens, use \u201CCopy message\u201D and paste it into an email to ' + recipient + '.');
      window.location.href = 'mailto:' + recipient + '?subject=' + encodeURIComponent(msg.subject) + '&body=' + encodeURIComponent(msg.body);
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (!validateAll()) return;

        var msg = buildMessage();
        var text = 'To: ' + recipient + '\nSubject: ' + msg.subject + '\n\n' + msg.body;
        copyText(text).then(function () {
          showStatus('success', 'Message copied. Paste it into an email to ' + recipient + '.');
        }).catch(function () {
          showStatus('error', 'Couldn\u2019t copy automatically. Copy your message by hand, or email ' + recipient + ' directly.');
        });
      });
    }
  }

  function initCharCounter() {
    var textarea = $('#message');
    var counter = $('#charCounter');
    var fill = $('#counterFill');
    var limitAlert = $('#limitAlert');
    if (!textarea || !counter) return;

    var max = parseInt(textarea.getAttribute('maxlength'), 10) || MESSAGE_MAX;

    function update() {
      var length = textarea.value.length;
      var ratio = Math.min(length / max, 1);
      var atLimit = length >= max;
      var nearLimit = length >= max * WARN_RATIO && !atLimit;

      counter.textContent = length + ' / ' + max;
      counter.classList.toggle('is-warn', nearLimit);
      counter.classList.toggle('is-limit', atLimit);

      if (fill) {
        fill.style.width = (ratio * 100) + '%';
        fill.classList.toggle('is-warn', nearLimit);
        fill.classList.toggle('is-limit', atLimit);
      }
      if (limitAlert) limitAlert.hidden = !atLimit;
    }

    textarea.addEventListener('input', update);
    update();
  }

  function initProjectFilter() {
    var bar = $('.filter-bar');
    if (!bar) return;

    var buttons = $$('.filter-btn', bar);
    var items = $$('.project-item');
    var countEl = $('#filterCount');

    function applyFilter(filter) {
      var shown = 0;

      items.forEach(function (item) {
        var categories = (item.getAttribute('data-category') || '').split(' ');
        var match = filter === 'all' || categories.indexOf(filter) !== -1;
        item.hidden = !match;
        if (match) {
          shown++;
          replayAnimation(item, 'filter-in');
        }
      });

      buttons.forEach(function (button) {
        var active = button.getAttribute('data-filter') === filter;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });

      if (countEl) countEl.textContent = 'showing ' + shown + ' of ' + items.length;
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        applyFilter(button.getAttribute('data-filter'));
      });
    });
  }

  function initNavToggle() {
    var toggle = $('.nav-toggle');
    var links = $('#navlinks');
    if (!toggle || !links) return;

    function setOpen(open) {
      links.classList.toggle('open', open);
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', function () {
      setOpen(!links.classList.contains('open'));
    });
    links.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 640) setOpen(false);
    });
  }

  function initBackToTop() {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'back-to-top';
    button.setAttribute('aria-label', 'Back to top');
    button.textContent = '\u2191';
    document.body.appendChild(button);

    function toggleVisibility() {
      button.classList.toggle('visible', window.scrollY > 400);
    }

    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();
  }

  /* Pause / play control for the Bootstrap carousel (home page).
     Hover-pause is switched off in the HTML (data-bs-pause="false") so this
     button is the single source of truth. */
  function initCarouselPause() {
    var carousel = $('#interestsCarousel');
    var button = $('#carouselToggle');
    if (!carousel || !button || !window.bootstrap || !window.bootstrap.Carousel) return;

    var instance = window.bootstrap.Carousel.getOrCreateInstance(carousel);
    var paused = false;

    function setPaused(value) {
      paused = value;
      if (paused) { instance.pause(); } else { instance.cycle(); }
      button.textContent = paused ? '\u25B6 play' : '\u275A\u275A pause';
      button.setAttribute('aria-label', paused ? 'Play carousel' : 'Pause carousel');
    }

    button.addEventListener('click', function () {
      setPaused(!paused);
    });
    // a swipe on touch screens makes Bootstrap resume on its own; re-pause if the visitor asked for a pause
    carousel.addEventListener('slid.bs.carousel', function () {
      if (paused) instance.pause();
    });

    if (prefersReducedMotion()) setPaused(true);
  }

  /* Click-to-reveal phone number: keeps it out of the page source. */
  function initPhoneReveal() {
    var triggers = $$('[data-phone-reveal]');
    if (!triggers.length) return;

    var display = PHONE_REVERSED.split('').reverse().join('');   // "+61 433 000 047"
    var dialable = display.replace(/[^\d+]/g, '');                // "+61433000047"

    function reveal(clicked) {
      $$('[data-phone-target]').forEach(function (el) {
        if (el.getAttribute('data-phone-target') === 'link') {
          el.href = 'tel:' + dialable;
          el.textContent = el.getAttribute('data-phone-label') || ('Call ' + display);
        } else {
          el.textContent = display;
        }
        el.hidden = false;
      });
      triggers.forEach(function (trigger) { trigger.hidden = true; });

      // hand keyboard focus to the link that replaced the button just clicked
      var next = clicked.nextElementSibling;
      if (next && next.hasAttribute('data-phone-target')) next.focus();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () { reveal(trigger); });
    });
  }

  function init() {
    initNavToggle();
    initBackToTop();
    initTerminalTyping();
    initQuoteGenerator();
    initContactForm();
    initCharCounter();
    initProjectFilter();
    initCarouselPause();
    initPhoneReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
