// Initialize SimpleMDE
var simplemde = new SimpleMDE({
    element: document.getElementById("result"),
    initialValue: ""
});

let allGroups = [];
let introText = '';
let outroText = '';

// Load YAML file
fetch('questions.yaml')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.text();
    })
    .then(yamlText => {
        const data = jsyaml.load(yamlText);
        displayIntroduction(data);
        allGroups = data.groups;
        introText = data.intro_text || '';
        outroText = data.outro_text || '';
        createQuestionnaire(data.groups);
    })
    .catch(error => console.error('Error fetching the YAML file:', error));

// Display title and introduction
function displayIntroduction(data) {
    document.getElementById('main-title').innerText = data.title;
    document.getElementById('introduction').innerHTML = marked.parse(data.introduction);
}

// Create questionnaire form
function createQuestionnaire(groups, parentDiv = document.getElementById('questionnaire'), level = 1) {
    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('mb-4', `pl-${level * 2}`);
        groupDiv.innerHTML = `<h${level + 3}>${group.group_name}</h${level + 3}>`;

        if (group.questions) {
            group.questions.forEach(question => {
                appendQuestion(groupDiv, question);
            });
        }

        if (group.groups) {
            createQuestionnaire(group.groups, groupDiv, level + 1);
        }

        parentDiv.appendChild(groupDiv);
    });

    if (level === 1) {
        generateFullText(); // Initial text generation
    }
}

// Helper function to append questions
function appendQuestion(parentDiv, question) {
    const div = document.createElement('div');
    div.classList.add('form-group', 'label-group');
    div.setAttribute('data-question-id', question.id);
    div.setAttribute('data-conditions', JSON.stringify(question.conditions || []));
    div.style.display = question.conditions && question.conditions.length > 0 ? 'none' : 'block'; // Show initially if no conditions

    div.innerHTML = `<label>${marked.parse(question.question)}</label>`;

    if (question.type === 'multiple_choice') {
        let defaultSelected = false;

        question.options.forEach(option => {
            const checked = option.default ? 'checked' : '';
            if (option.default) {
                defaultSelected = true;
            }
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="${question.id}" id="${option.id}" value="${option.text_block}" ${checked} ${option.default ? 'data-default="true"' : ''}>
                    <label class="form-check-label" for="${option.id}">${option.label}</label>
                </div>
            `;
        });

        if (question.none_option) {
            const checked = defaultSelected ? '' : 'checked';
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="${question.id}" id="${question.id}_none" value="" ${checked}>
                    <label class="form-check-label" for="${question.id}_none">${question.none_option}</label>
                </div>
            `;
        }
    } else if (question.type === 'checkbox') {
        question.options.forEach(option => {
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="${question.id}" id="${option.id}" value="${option.text_block}" ${option.default ? 'checked' : ''}>
                    <label class="form-check-label" for="${option.id}">${option.label}</label>
                </div>
            `;
        });
    } else if (question.type === 'text') {
        const multiline = question.multiline || false; // Default value is false
        let textInput;

        if (multiline) {
            textInput = document.createElement('textarea');
            textInput.name = question.id;
            textInput.rows = 4;
            textInput.cols = 50;
        } else {
            textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.name = question.id;
            textInput.classList.add('form-control');
        }

        if (question.placeholder) {
            textInput.placeholder = question.placeholder;
        }

        if (question.default_from) {
            textInput.setAttribute('data-default-from', question.default_from);
        }

        div.appendChild(textInput);

        textInput.addEventListener('input', () => {
            textInput.dataset.userChanged = 'true';
            generateFullText();
        });
    }

    parentDiv.appendChild(div);

    // Add event listeners to update the text on change
    const inputs = div.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            checkConditions();
            generateFullText();
        });
    });

    // Add event listeners to update the text on input
    const textareas = div.querySelectorAll('textarea, input[type="text"]');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', () => {
            checkConditions();
            generateFullText();
        });
    });

    // Check conditions initially
    setTimeout(checkConditions, 0); // Ensure conditions are checked after initial render
}

// Function to check conditions
function checkConditions() {
    const form = document.getElementById('questionnaire');
    const questions = form.querySelectorAll('[data-question-id]');

    questions.forEach(questionDiv => {
        const conditions = JSON.parse(questionDiv.getAttribute('data-conditions'));
        if (conditions.length === 0) {
            questionDiv.style.display = 'block';
            return;
        }

        let showQuestion = true;
        conditions.forEach(condition => {
            const conditionInput = form.querySelector(`[name="${condition.id}"]`);
            if (conditionInput.type === 'radio' || conditionInput.type === 'checkbox') {
                if (!conditionInput.checked && condition.value === conditionInput.value) {
                    showQuestion = false;
                }
            } else if (conditionInput.value !== condition.value) {
                showQuestion = false;
            }
        });

        questionDiv.style.display = showQuestion ? 'block' : 'none';
    });
}

// Function to replace tokens with actual values
function replaceTokens(text, form) {
    return text.replace(/\[([^\]]+)\]/g, (_, key) => {
        const inputElement = form.querySelector(`[name="${key}"]`);
        if (!inputElement) return ''; // Kein Input-Feld gefunden, kein Wert zu ersetzen.

        // Überprüfen, ob der Benutzer einen Wert eingegeben hat
        let value = inputElement.value.trim();
        if (value) return value; // Direkter Wert des Input-Elements, falls vorhanden

        // Verwenden des Werts aus default_from, falls vorhanden und kein Benutzerwert gesetzt ist
        const defaultFrom = inputElement.getAttribute('data-default-from');
        if (defaultFrom) {
            const defaultFromElement = form.querySelector(`[name="${defaultFrom}"]`);
            value = defaultFromElement ? defaultFromElement.value.trim() : '';
            if (value) return value;
        }

        // Verwenden des Platzhalters, wenn kein anderer Wert gefunden wurde
        return inputElement.placeholder || '';
    });
}

// Generate full text including intro and outro
function generateFullText() {
    const form = document.getElementById('questionnaire');

    let text = introText ? `${replaceTokens(introText, form)}\n\n` : '';
    text += generateText(allGroups, form);
    if (outroText) {
        text += `\n\n${replaceTokens(outroText, form)}`;
    }

    simplemde.value(text); // Set the generated text in the SimpleMDE editor

    // Toggle preview mode to ensure rendering
    simplemde.togglePreview();

    // Check if the editor is in preview mode, if not toggle it to preview mode
    if (!simplemde.isPreviewActive()) {
        simplemde.togglePreview(); // First toggle to preview mode
    }
}

// Generate text based on answers
function generateText(groups, form, level = 1) {
    let text = '';

    groups.forEach(group => {
        let groupText = '';
        let hasContent = false;

        if (group.questions) {
            group.questions.forEach(question => {
                const values = form.querySelectorAll(`[name="${question.id}"]:checked`);
                if (question.type === 'multiple_choice' || question.type === 'checkbox') {
                    if (values.length > 0) {
                        values.forEach(value => {
                            if (question.pre_text) {
                                groupText += question.pre_text;
                            }
                            let textBlock = value.value;
                            // Replace tokens
                            textBlock = replaceTokens(textBlock, form);
                            groupText += textBlock;
                            if (question.post_text) {
                                groupText += question.post_text;
                            }
                            groupText += '\n\n';
                            hasContent = true;
                        });
                    }
                } else if (question.type === 'text') {
                    const textInput = form.querySelector(`textarea[name="${question.id}"], input[name="${question.id}"]`);
                    if (textInput && textInput.value.trim() !== '') {
                        if (question.pre_text) {
                            groupText += question.pre_text;
                        }
                        let textBlock = question.text_block.replace('[USER_INPUT]', textInput.value.trim());
                        // Replace tokens
                        textBlock = replaceTokens(textBlock, form);
                        groupText += textBlock;
                        if (question.post_text) {
                            groupText += question.post_text;
                        }
                        groupText += '\n\n';
                        hasContent = true;
                    }
                }
            });
        }

        if (group.groups) {
            const subGroupText = generateText(group.groups, form, level + 1);
            if (subGroupText.trim() !== '') {
                groupText += subGroupText;
                hasContent = true;
            }
        }

        if (hasContent) {
            if (group.show_group_name !== false) {
                text += `${'#'.repeat(level + 2)} ${group.group_name}\n\n`;
            }
            text += groupText;
        }
    });

    return text;
}

// Initial call to check conditions after loading the form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('questionnaire');
    const questions = form.querySelectorAll('[data-question-id]');

    questions.forEach(questionDiv => {
        const conditions = JSON.parse(questionDiv.getAttribute('data-conditions'));
        if (conditions.length === 0) {
            questionDiv.style.display = 'block';
        }
    });

    checkConditions();
    generateFullText(); // Generate initial text with default values
});
