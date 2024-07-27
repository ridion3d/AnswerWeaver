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
    div.innerHTML = `<label>${marked.parse(question.question)}</label>`;

    if (question.type === 'multiple_choice') {
        question.options.forEach(option => {
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="${question.id}" id="${option.id}" value="${option.text_block}">
                    <label class="form-check-label" for="${option.id}">${option.label}</label>
                </div>
            `;
        });
    } else if (question.type === 'checkbox') {
        question.options.forEach(option => {
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="${question.id}" id="${option.id}" value="${option.text_block}">
                    <label class="form-check-label" for="${option.id}">${option.label}</label>
                </div>
            `;
        });
    } else if (question.type === 'text') {
        const textInput = document.createElement('textarea');
        textInput.name = question.id;
        textInput.rows = 4;
        textInput.cols = 50;
        div.appendChild(textInput);
        textInput.addEventListener('input', () => generateFullText()); // Add input event listener
    }

    parentDiv.appendChild(div);

    // Add event listeners to update the text on change
    const inputs = div.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', () => generateFullText());
    });
}

// Generate full text including intro and outro
function generateFullText() {
    let text = introText ? `${introText}\n\n` : '';
    text += generateText(allGroups);
    if (outroText) {
        text += `\n\n${outroText}`;
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
function generateText(groups, level = 1) {
    const form = document.getElementById('questionnaire');
    let text = '';

    groups.forEach(group => {
        let groupText = '';
        if (group.show_group_name !== false) {
            groupText += `${'#'.repeat(level + 2)} ${group.group_name}\n\n`;
        }
        const formData = new FormData(form);
        let hasContent = false;

        if (group.questions) {
            group.questions.forEach(question => {
                const values = formData.getAll(question.id);
                if (values.length > 0) {
                    hasContent = true;
                    values.forEach(value => {
                        if (question.pre_text) {
                            groupText += `${question.pre_text}`;
                        }
                        groupText += `${value}`;
                        if (question.post_text) {
                            groupText += `${question.post_text}`;
                        }
                        groupText += `\n\n`;
                    });
                } else if (question.type === 'text') {
                    const textInput = form.querySelector(`textarea[name="${question.id}"]`);
                    if (textInput && textInput.value.trim() !== '') {
                        hasContent = true;
                        if (question.pre_text) {
                            groupText += `${question.pre_text}`;
                        }
                        groupText += question.text_block.replace('[USER_INPUT]', textInput.value.trim());
                        if (question.post_text) {
                            groupText += `${question.post_text}`;
                        }
                        groupText += `\n\n`;
                    }
                }
            });
        }

        if (group.groups) {
            const subGroupText = generateText(group.groups, level + 1);
            if (subGroupText) {
                groupText += subGroupText;
                hasContent = true;
            }
        }

        if (hasContent) {
            text += groupText;
        }
    });

    return text;
}
