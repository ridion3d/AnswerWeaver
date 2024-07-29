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
    div.style.display = 'none'; // Hide initially until conditions are checked

    div.innerHTML = `<label>${marked.parse(question.question)}</label>`;

    if (question.type === 'multiple_choice') {
        question.options.forEach(option => {
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="${question.id}" id="${option.id}" value="${option.id}" ${option.default ? 'checked' : ''}>
                    <label class="form-check-label" for="${option.id}">${option.label}</label>
                </div>
            `;
        });
    } else if (question.type === 'checkbox') {
        question.options.forEach(option => {
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="${question.id}" id="${option.id}" value="${option.id}" ${option.default ? 'checked' : ''}>
                    <label class="form-check-label" for="${option.id}">${option.label}</label>
                </div>
            `;
        });
    } else if (question.type === 'text') {
        const multiline = question.multiline || false; // Default value is false
        if (multiline) {
            const textInput = document.createElement('textarea');
            textInput.name = question.id;
            textInput.rows = 4;
            textInput.cols = 50;
            if (question.placeholder) {
                textInput.placeholder = question.placeholder;
            }
            div.appendChild(textInput);
            textInput.addEventListener('input', () => generateFullText()); // Add input event listener
        } else {
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.name = question.id;
            textInput.classList.add('form-control');
            if (question.placeholder) {
                textInput.placeholder = question.placeholder;
            }
            div.appendChild(textInput);
            textInput.addEventListener('input', () => generateFullText()); // Add input event listener
        }
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

    // Check conditions initially
    checkConditions();
}

// Check conditions to show or hide questions
function checkConditions() {
    const form = document.getElementById('questionnaire');
    const questions = form.querySelectorAll('[data-question-id]');

    questions.forEach(questionDiv => {
        const conditions = JSON.parse(questionDiv.getAttribute('data-conditions'));
        let showQuestion = true;

        conditions.forEach(condition => {
            const conditionQuestion = form.querySelector(`[name="${condition.id}"]`);
            if (conditionQuestion) {
                const conditionMet = [...form.querySelectorAll(`[name="${condition.id}"]:checked`)]
                    .map(input => input.value)
                    .includes(condition.value);
                if (!conditionMet) {
                    showQuestion = false;
                }
            }
        });

        questionDiv.style.display = showQuestion ? 'block' : 'none';
    });
}

// Generate full text including intro and outro
function generateFullText() {
    const answers = collectAnswers(allGroups);

    let text = introText ? replacePlaceholders(introText, answers) + '\n\n' : '';
    text += generateText(allGroups, answers);
    if (outroText) {
        text += '\n\n' + replacePlaceholders(outroText, answers);
    }

    simplemde.value(text); // Set the generated text in the SimpleMDE editor

    // Toggle preview mode to ensure rendering
    simplemde.togglePreview();

    // Check if the editor is in preview mode, if not toggle it to preview mode
    if (!simplemde.isPreviewActive()) {
        simplemde.togglePreview(); // First toggle to preview mode
    }
}

// Replace placeholders with answers
function replacePlaceholders(text, answers) {
    Object.keys(answers).forEach(key => {
        text = text.replace(new RegExp(`\\[${key}\\]`, 'g'), answers[key]);
    });
    return text;
}

// Collect all answers first
function collectAnswers(groups, level = 1) {
    const form = document.getElementById('questionnaire');
    const answers = {};

    groups.forEach(group => {
        if (group.questions) {
            group.questions.forEach(question => {
                if (question.type === 'multiple_choice' || question.type === 'checkbox') {
                    const values = [...form.querySelectorAll(`[name="${question.id}"]:checked`)].map(input => input.nextSibling.textContent.trim());
                    if (values.length > 0) {
                        answers[question.id] = values.join(', ');
                    }
                } else if (question.type === 'text') {
                    const textInput = form.querySelector(`textarea[name="${question.id}"], input[name="${question.id}"]`);
                    if (textInput && textInput.value.trim() !== '') {
                        answers[question.id] = textInput.value.trim();
                    }
                }
            });
        }

        if (group.groups) {
            const subGroupAnswers = collectAnswers(group.groups, level + 1);
            Object.assign(answers, subGroupAnswers);
        }
    });

    return answers;
}

// Generate text based on answers
function generateText(groups, answers, level = 1) {
    const form = document.getElementById('questionnaire');
    let text = '';

    groups.forEach(group => {
        let groupText = '';
        if (group.show_group_name !== false) {
            groupText += `${'#'.repeat(level + 2)} ${group.group_name}\n\n`;
        }

        if (group.questions) {
            group.questions.forEach(question => {
                const values = form.querySelectorAll(`[name="${question.id}"]:checked`);
                if (question.type === 'multiple_choice' || question.type === 'checkbox') {
                    if (values.length > 0) {
                        values.forEach(value => {
                            const selectedOption = question.options.find(option => option.id === value.value);
                            if (selectedOption) {
                                if (question.pre_text) {
                                    groupText += question.pre_text;
                                }
                                let textBlock = selectedOption.text_block;
                                // Replace placeholders
                                textBlock = replacePlaceholders(textBlock, answers);
                                groupText += textBlock;
                                if (question.post_text) {
                                    groupText += question.post_text;
                                }
                                groupText += '\n\n';
                            }
                        });
                    }
                } else if (question.type === 'text') {
                    const textInput = form.querySelector(`textarea[name="${question.id}"], input[name="${question.id}"]`);
                    if (textInput && textInput.value.trim() !== '') {
                        if (question.pre_text) {
                            groupText += question.pre_text;
                        }
                        let textBlock = question.text_block.replace('[USER_INPUT]', textInput.value.trim());
                        // Replace placeholders
                        textBlock = replacePlaceholders(textBlock, answers);
                        groupText += textBlock;
                        if (question.post_text) {
                            groupText += question.post_text;
                        }
                        groupText += '\n\n';
                    }
                }
            });
        }

        if (group.groups) {
            const subGroupText = generateText(group.groups, answers, level + 1);
            if (subGroupText) {
                groupText += subGroupText;
            }
        }

        if (groupText.trim() !== '') {
            text += groupText;
        }
    });

    return text;
}
