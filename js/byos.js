var tasks = JSON.parse(localStorage.getItem('tasks')) || generate_default_tasks()

tasks.forEach(add_task)

$('#new_task').on('blur keypress', new_task)
$('[name=delete_all_tasks]').click(delete_all_tasks)
$('.delete_task').click(delete_task)
$('[name=completed]').change()

function new_task (e) {
    if (e.target.value != '' && (e.type == 'blur' || e.which == 13 || e.which == 0)) {
      var task = { title: e.target.value.trim(), id: tasks.length }
      tasks.push(task)
      add_task(task)
      localStorage.setItem('tasks', JSON.stringify(tasks))
      e.target.value = ''
    }
}

function add_task (task){
  $('#tasks').append("<div class=task id=" + task.id + "><input type=checkbox name=completed /><span class=title>"+ task.title + "</span><span class='delete_task'>x</span><span class='edit_task'>Aa</span></div>")
}

function generate_default_tasks () {
  var verbs = [ 'encourage', 'entice', 'castigate', 'fluster' ]
  var nouns = [ 'a llama', 'a pod of dolphins', 'the king of spain', 'john wayne', 'kanye west']

  return (3).times(function (i) {
    return { title: random(verbs) + ' ' + random(nouns), id: i }
  })
}

function delete_task (e) {
  var task_id = $(e.target).closest('.task').remove().attr('id')
  tasks = tasks.filter(function (task) {
    return task.id != task_id
  })
  localStorage.setItem('tasks', JSON.stringify(tasks))
  console.log(tasks)
}
function delete_all_tasks () {
  localStorage.setItem('tasks', null)
  $('#tasks').empty()
}
