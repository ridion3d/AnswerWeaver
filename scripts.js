fetch('questions.yaml')
    .then(response => response.text())
    .then(text => {
        const doc = jsyaml.load(text);
        document.getElementById('form-title').innerText = doc.title;
        document.getElementById('form-introduction').innerHTML = marked(doc.introduction);
        generateForm(doc.groups);
    })
    .catch(error => console.log(error));

function generateForm(groups) {
    const form = document.getElementById('questionnaire');
    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('group');

        const groupTitle = document.createElement('h3');
        groupTitle.innerText = group.group_name;
        groupDiv.appendChild(groupTitle);

        group.questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question');

            const questionLabel = document.createElement('label');
            questionLabel.innerText = question.question;
            questionDiv.appendChild(questionLabel);

            if (question.type === 'multiple_choice') {
                question.options.forEach(option => {
                    const optionLabel = document.createElement('label');
                    const optionInput = document.createElement('input');
                    optionInput.type = 'radio';
                    optionInput.name = question.id;
                    optionInput.value = option.text_block;
                    optionLabel.appendChild(optionInput);
                    optionLabel.appendChild(document.createTextNode(option.label));
                    questionDiv.appendChild(optionLabel);
                });
            } else if (question.type === 'checkbox') {
                question.options.forEach(option => {
                    const optionLabel = document.createElement('label');
                    const optionInput = document.createElement('input');
                    optionInput.type = 'checkbox';
                    optionInput.name = question.id;
                    optionInput.value = option.text_block;
                    optionLabel.appendChild(optionInput);
                    optionLabel.appendChild(document.createTextNode(option.label));
                    questionDiv.appendChild(optionLabel);
                });
            } else if (question.type === 'text') {
                const textInput = document.createElement('textarea');
                textInput.name = question.id;
                textInput.rows = 4;
                textInput.cols = 50;
                questionDiv.appendChild(textInput);
            }

            groupDiv.appendChild(questionDiv);
        });

        form.appendChild(groupDiv);
    });
}

function generateDocument() {
    fetch('questions.yaml')
        .then(response => response.text())
        .then(text => {
            const doc = jsyaml.load(text);
            let generatedText = '';

            generatedText += marked(doc.intro_text);

            doc.groups.forEach(group => {
                group.questions.forEach(question => {
                    if (question.type === 'multiple_choice') {
                        const selectedOption = document.querySelector(`input[name="${question.id}"]:checked`);
                        if (selectedOption) {
                            generatedText += selectedOption.value + '\n';
                        }
                    } else if (question.type === 'checkbox') {
                        const selectedOptions = document.querySelectorAll(`input[name="${question.id}"]:checked`);
                        selectedOptions.forEach(option => {
                            generatedText += option.value + '\n';
                        });
                    } else if (question.type === 'text') {
                        const textInput = document.querySelector(`textarea[name="${question.id}"]`);
                        if (textInput && textInput.value.trim() !== '') {
                            generatedText += question.text_block.replace('[USER_INPUT]', textInput.value.trim()) + '\n';
                        }
                    }
                });
            });

            generatedText += marked(doc.outro_text);

            document.getElementById('generated-document').value = generatedText;
        })
        .catch(error => console.log(error));
}
