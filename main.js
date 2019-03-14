$(document).ready(function () {

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // jQuery elems to avoid unnecessary re-selecting
    const $btnNewWord = $("#btn-new-word");
    const $winStreak = $("#win-streak");
    const $remainingAttempts = $("#remaining-attempts");
    const $attemptCount = $("#attempt-count");
    const $challengeWordWrap = $("#challenge-word-wrap");
    const $challengeWordLettersWrap = $("#challenge-word-letters-wrap");

    class HangmanGame {

        constructor(maxAttempts, minWordLen) {

            this.maxAttempts = maxAttempts;
            this.minWordLen = minWordLen;
            this.attemptCount = 0;
            this.correctCount = 0;
            this.challengeWord = '';
            this.challengeWordLetters = [];
            this.challengeWordLen = 0;
            this.sessionWinStreak = 0;
            this.isLoading = false; // do nothing with user input until loaded
            this.keyElemMap = {
                sessionWinStreak: $winStreak,
                attemptCount: $attemptCount
            }
        }
        isGameWon() { return this.correctCount === this.challengeWordLen; }
        isGameLost() { return this.attemptCount === this.maxAttempts; }
        isGameInProgress() { return this.isGameLost() === false && this.isGameWon() === false }

        setChallengeWord(wordsArr) {

            this.challengeWord = wordsArr[randomIntFromRange(0, wordsArr.length)]
            this.challengeWordLetters = this.challengeWord.split("");
            this.challengeWordLen = this.challengeWord.length;
            setChallengeWordElems(this);
        }

        updateDisplayCount(key, reset) {
            reset ? this[key] = 0 : this[key]++;
            this.keyElemMap[key].html(this[key]);
        }

        startGame(isFirstRound) {

            const self = this;
            self.isLoading = true;
            if (isFirstRound) displayAlphabetHtml(alphabet, self);

            self.updateDisplayCount('attemptCount', true)
            self.correctCount = 0;
            $(".selectable-letters").removeClass("text-red text-green selected");
            $remainingAttempts.removeClass('text-red');

            fetch('http://api.icndb.com/jokes/random')
                .then(handleErrors)
                .then(response => response.json())
                .then((json => self.setChallengeWord(getWordsFromStr(json.value.joke, self.minWordLen))))
                .catch(error => console.log(error));
        }
    }

    const hangmanGame = new HangmanGame(8, 4);
    hangmanGame.startGame(true);

    function initializeListeners(currGame) {

        $btnNewWord.on('click', () => {

            if (currGame.isGameLost()) currGame.updateDisplayCount('sessionWinStreak', true);
            currGame.startGame();
            $btnNewWord.addClass('invisible');
        });

        $('#selectable-letters-wrap').on('click', (evt) => {
            checkSelectedLetter($(evt.target), currGame)
        });

        $(document).keypress((e) => {

            if (alphabet.includes(e.key.toUpperCase())) {
                checkSelectedLetter($("#letter-choice-" + e.key), currGame);
            }
        });
    }

    function getWordsFromStr(str, minLen) {
        // regex to only include letters, spaces, and hyphens, removes HTML &quot entity string
        return str.replace(/[^A-Za-z\s-]/g, '').split(" ").filter(word => (word.length >= minLen && word[0] !== word[0].toUpperCase() && !word.includes("-") && !word.includes('quot')));
    }

    function setChallengeWordElems(currGame) {

        let opacity = 0;
        $challengeWordWrap.css('opacity', opacity);

        $challengeWordLettersWrap.removeClass("text-red text-green");
        $(".challenge-word-chars").remove();

        for (let i = 0; i < currGame.challengeWord.length; i++) {
            $challengeWordLettersWrap.append(elemBuilder(true, 'span', { id: 'letter-' + i, class: 'challenge-word-chars' }, '&nbsp;'));
            $("#challenge-word-underscores-wrap").append(elemBuilder(true, 'span', { class: 'challenge-word-chars' }, '_'));
        }

        currGame.isLoading = false;

        let intervalId = setInterval(() => {

            opacity >= 1 ? clearInterval(intervalId) : opacity += 0.05;
            $challengeWordWrap.css('opacity', opacity);

        }, 30)

    }

    function showChallengeWord(letterIndex, word) {

        const letterIdx = parseInt(letterIndex);

        // show all
        if (letterIdx === -1) {
            for (let i = 0; i < word.length; i++) {
                $("#letter-" + i).html(word[i]);
            }
        }
        else if (letterIdx >= 0) $("#letter-" + letterIdx).html(word[letterIdx]);
    }

    function displayAlphabetHtml(letters, currGame) {

        const $availLettersWrap = $('#selectable-letters-wrap');

        while (letters) {

            let $currRow = elemBuilder(false, 'div', { class: 'row' });
            let $lettersWrap = elemBuilder(false, 'p', { class: 'center-block' });
            let lettersPerRow = 0;

            while (letters && lettersPerRow < 6) {

                let currLetter = letters.substring(0, 1);
                let $letterSpan = elemBuilder(false, 'span', { id: 'letter-choice-' + currLetter.toLowerCase(), class: 'selectable-letters' }, currLetter);
                $lettersWrap.append($letterSpan);
                letters = letters.substring(1, letters.length);
                lettersPerRow += 1;
            }
            $currRow.append($lettersWrap);
            $availLettersWrap.append($currRow);
        }
        initializeListeners(currGame);
    }

    function showNewWordBtn() {
        $btnNewWord.removeClass('invisible');
        $btnNewWord.focus();
    }

    function checkSelectedLetter($elem, currGame) {

        if (currGame.isLoading) return

        const targetClassList = $elem[0].className;
        const targetIsLetter = targetClassList.includes("selectable-letters");
        const newSelection = !targetClassList.includes("selected");
        const selectedLetter = targetIsLetter ? $elem.html().toLowerCase() : '';
        let noMatch = true;

        if (targetIsLetter
            && newSelection
            && currGame.isGameInProgress()
        ) {

            $elem.addClass('selected');

            for (let i = 0; i < currGame.challengeWordLen; i++) {

                if (selectedLetter === currGame.challengeWordLetters[i]) {

                    noMatch = false;
                    $elem.addClass("text-green");
                    showChallengeWord(i, currGame.challengeWord);
                    currGame.correctCount++;

                    if (currGame.isGameWon()) {

                        currGame.updateDisplayCount('sessionWinStreak');
                        $challengeWordLettersWrap.addClass("text-green");
                        showNewWordBtn();
                        return;
                    }
                }
            }
            // after every letter is checked for a match
            if (noMatch) {
                $elem.addClass('text-red');
                currGame.updateDisplayCount('attemptCount')

                if (currGame.isGameLost()) {

                    $remainingAttempts.addClass('text-red');
                    showChallengeWord(-1, currGame.challengeWord);
                    $challengeWordLettersWrap.addClass("text-red");
                    showNewWordBtn();
                }
            }
        }
    }

});