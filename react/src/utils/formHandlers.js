import {elementType} from "prop-types"

  const getValue = (type, isForUpdate, oldData, control, label, required) => {
    if (type === 'file') {return ''}
    if (isForUpdate) {
      if (type === 'date') {
        return {
        day: new Date(oldData[control]).getDate(), 
        month: new Date(oldData[control]).getMonth(), 
        year: new Date(oldData[control]).getFullYear()
        }
      }
      if (type === 'time') {
        return {
          hours: oldData[control] ? oldData[control].split(':')[0] : '00',
          minutes: oldData[control] ? oldData[control].split(':')[1] : '00'
          }
      }
      if (type === 'datetime') {
        return {
        day: new Date(oldData[control]).getDate(), 
        month: new Date(oldData[control]).getMonth(), 
        year: new Date(oldData[control]).getFullYear(),
        hours: new Date(oldData[control]).getHours(),
        minutes: new Date(oldData[control]).getMinutes()
        }
      }
      if (type === 'course') {
        return {
        course: oldData[control].course,  
        year: new Date(oldData[control]).getFullYear(),
        term: oldData[control].term
        }
      }
       if (type === 'radio') {
        return oldData[control]
       }
      return oldData[control] || ''
    }
    if (type === 'date') {return {day: '', month: new Date().getMonth(), year: new Date().getFullYear()}}
    if (type === 'datetime') {return {day: '', month: new Date().getMonth(), year: new Date().getFullYear(), hours: '00', minutes: '00' }}
    if (type === 'time') {return {hours: '00', minutes: '00'}}
    if (type === 'radio') { return label[0].value}
    if (type === 'course') {return {course: '', year: new Date().getFullYear(), term: 1}}
    return ''
  }

 const createPostForm = (template, post) => {
   const forUpdate = Object.entries(post).length !== 0
   return template.map(element => {
      return {
      ...element,
      value: getValue(element.type, forUpdate, post, element.title, element.label, element.required),
      valid: forUpdate || !element.required || element.type === 'radio' || element.type === 'check',
      touched: false
    } 
    }) 
 }
 
 const postInputChange = (form, id, value) => {
    
    let isValid = true
    if (form[id].validators && form[id].validators.length > 0) {
      for (const validator of form[id].validators) {
          isValid = isValid && validator(value)
      }
    }
    const updatedForm = form.map((control, idx) => {
      if (idx !== id ) {
        return control
      }
      return {
        ...control,
        value: value,
        valid: isValid
      }
    })

    let formIsValid = true

    updatedForm.forEach( item =>
      {formIsValid = formIsValid && item.valid}
    )

    return {
      postForm: updatedForm,
      formIsValid: formIsValid
    }
  }

  const postInputBlur = (form, id) => {
    return form.map((control, idx) => {
      if (idx !== id) {
        return control
      }
      return {
        ...control,
        touched: true
      }
    })
  }

  export { postInputChange, postInputBlur, createPostForm }