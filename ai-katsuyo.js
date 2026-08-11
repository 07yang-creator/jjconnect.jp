// かつよ度 self-test: fold open, pick one, confirm -> reveal every result, highlight the reader's
(function () {
    Array.prototype.forEach.call(document.querySelectorAll('.quiz'), function (quiz) {
        var toggle  = quiz.querySelector('.quiz-toggle');
        var body    = quiz.querySelector('.quiz-body');
        var submit  = quiz.querySelector('.quiz-submit');
        var results = quiz.querySelector('.quiz-results');
        var opts    = Array.prototype.slice.call(quiz.querySelectorAll('.quiz-opt'));
        var badge   = quiz.getAttribute('data-badge') || '';

        toggle.addEventListener('click', function () {
            var opening = body.hasAttribute('hidden');
            if (opening) { body.removeAttribute('hidden'); } else { body.setAttribute('hidden', ''); }
            toggle.setAttribute('aria-expanded', String(opening));
        });

        opts.forEach(function (opt) {
            opt.querySelector('input').addEventListener('change', function () {
                opts.forEach(function (o) { o.classList.toggle('is-checked', o.querySelector('input').checked); });
                submit.disabled = false;
            });
        });

        submit.addEventListener('click', function () {
            var picked = quiz.querySelector('.quiz-opt input:checked');
            if (!picked) return;
            results.removeAttribute('hidden');
            Array.prototype.forEach.call(quiz.querySelectorAll('.quiz-result'), function (row) {
                var mine = row.getAttribute('data-k') === picked.value;
                row.classList.toggle('is-you', mine);
                var head = row.querySelector('h4');
                var old  = head.querySelector('.quiz-badge');
                if (old) { head.removeChild(old); }
                if (mine && badge) {
                    var tag = document.createElement('span');
                    tag.className = 'quiz-badge';
                    tag.textContent = badge;
                    head.appendChild(tag);
                }
            });
        });
    });
})();
