import React from 'react'
import { useQuery, useMutation } from '@apollo/react-hooks'
import { gql } from 'apollo-boost'
import { required, length } from './utils/validators'
import { useLocation } from 'react-router-dom'

import Header from './components/UI/Header/Header'
import Blogpost from './components/Blog/Blogpost'
import ButtonAddNew from './components/UI/ButtonAddNew'
import Modal from './components/UI/Modal'
import Edit from './components/Shared/Edit'
import Spinner from './components/UI/Spinner'
import Pagination from './components/UI/Pagination'
import ErrorBoundry from './components/Shared/ErrorHandling/ErrorBoundry'
import getUpdateData from './utils/getObjectForUpdate'
import NetworkErrorComponent from './components/Shared/ErrorHandling/NetworkErrorComponent'

const POSTS_PER_PAGE = 5

const GET_BLOGPOSTS = gql`                    
    query getBlogposts($limit: Int, $offset: Int){
      blogposts(limit: $limit, offset: $offset) {
        posts{
          id,
          title,
          content,
          description,
          imageUrl,
          createdAt
        }
        total
    }
  }
  `
const CREATE_BLOGPOST = gql`
  mutation createBlogpost($inputData: BlogpostCreateData!) {
    createBlogpost(inputData: $inputData) {
      id
      title
      description
      content
      imageUrl
      createdAt
    }
  }
`

const DELETE_BLOGPOST = gql`
  mutation deleteBlogpost($id: ID!) {
    deleteBlogpost(id: $id) 
  }
`
const UPDATE_BLOGPOST = gql`
  mutation updateBlogpost($id: ID!, $inputData: BlogpostUpdateData!) {
    updateBlogpost(id: $id, inputData: $inputData) {
      id
      title
      description
      content
      imageUrl
      createdAt
    }
  }
`

const FORM_TEMPLATE = [
  {
    title: 'image',
    label:'Картинка',
    type: 'file',
    required: true,
    validators: [required]
  },
  {
    title: 'title',
    label:'Название',
    type: 'input',
    required: true,
    validators: [required, length({ min: 5 })]
  },
  {
    title: 'description',
    label:'Описание',
    type:'textarea',
    required: true,
    validators: [required, length({ min: 5, max: 250 })]
  },
  {
    title: 'content',
    label:'Содержание',
    type:'textarea-long',
    required: true,
    validators: [required, length({ min: 50 })]
  }
] 

function useQueryUrl() {
  return new URLSearchParams(useLocation().search)
}

const Blog = () => {

  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [mode, setMode] = React.useState({isEditing: false, isCreating: false, isDeleting: false})
  const [pageNumber, setPageNumber] = React.useState(1)
  const [updatedPost, setUpdatedPost] = React.useState({})
  const [isAbleToSave, setIsAbleToSave] = React.useState(true)

  const queryUrl = useQueryUrl()
  const urlId = queryUrl.get("id")

  console.log(id)

  const variables = {
    offset:0, 
    limit: POSTS_PER_PAGE
  }

  const { loading: queryLodading, error: queryError, data, fetchMore } = useQuery(
        GET_BLOGPOSTS, {variables, fetchPolicy: 'cache-and-network' })
  const [createBlogpost,
        { loading: creationLoading, error: creatingError }] = useMutation(CREATE_BLOGPOST, {
            update(cache, { data: {createBlogpost} }) {
              const { blogposts } = cache.readQuery({ query: GET_BLOGPOSTS, variables })
              cache.writeQuery({
                query: GET_BLOGPOSTS,
                variables,
                data: { blogposts:  {...blogposts, posts:  [createBlogpost, ...blogposts.posts]}}
              })
            }
          })
  const [updateBlogpost,
        { loading: updatingLoading, error: updatingError }] = useMutation(UPDATE_BLOGPOST)
  const [deleteBlogpost,
        { loading: deletingLoading, error: deletingError }] = useMutation(DELETE_BLOGPOST, {
          update(cache, { data: { deleteBlogpost } }) {
            const { blogposts } = cache.readQuery({ query: GET_BLOGPOSTS , variables})
            cache.writeQuery({
              query: GET_BLOGPOSTS,
              variables,
              data: { blogposts: {...blogposts, posts: blogposts.posts.filter(el => el.id !== deleteBlogpost)}}
            })
          }
        })
  
  if (queryLodading) return <Spinner />
 
  if (queryError) return <NetworkErrorComponent error={queryError} />
  if (updatingError) return <NetworkErrorComponent error={updatingError} />
  if (deletingError) return <NetworkErrorComponent error={deletingError} />
  if (creatingError) return <NetworkErrorComponent error={creatingError} />

  const blogposts = data.blogposts.posts
  const totalPages = Math.ceil(data.blogposts.total/POSTS_PER_PAGE)

  const onAddNewBlogpost = () => {
    setIsModalOpen(true)
    setMode({...mode, isCreating: true})
    document.body.style.overflow = "hidden"
  }

  const onEditBlogpost = (id) => {
    setIsModalOpen(true)
    setMode({...mode, isEditing: true})
    document.body.style.overflow = "hidden"
    setUpdatedPost(blogposts[id])
  }
  const onDeleteBlogpost = (id) => {
    setIsModalOpen(true)
    document.body.style.overflow = "hidden"
    setMode({...mode, isDeleting: true})
    setUpdatedPost(blogposts[id])
    //setUpdatedPost(blogposts[id])
  }

  const onDeletePostHandler = async () => {
    await deleteBlogpost({ variables: {id: updatedPost.id}})
    setIsModalOpen(false)
    setMode({...mode, isDeleting: false})
    document.body.style.overflow = "scroll"
    setUpdatedPost({})
  }

  const onPaginate = (page) => {
    fetchMore({
      variables: {
        offset: POSTS_PER_PAGE*(page-1)
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev
        return Object.assign({}, prev, {
          blogposts: { 
              ...prev.blogposts, 
              posts: [...fetchMoreResult.blogposts.posts]}
          } 
        )
    }})
    setPageNumber(page)
  }

  const onCloseModal = () => {
    setIsModalOpen(false)
    setMode({isDeleting: false, isEditing: false, isCreating: false})
    setUpdatedPost({})
    document.body.style.overflow = "scroll"
  }

  const onChangePostHandler = async (e, postData, valid) => {
    e.preventDefault()
    if (!valid) {
      setIsAbleToSave(false)
    }
    else {
      let postObject = postData
        .reduce((obj, item) => 
        { 
        obj[item.title] = item.value  
        return obj
        }, {})
      if (mode.isEditing) {
        let forUpdate = getUpdateData(updatedPost, postObject)
        await updateBlogpost({ variables: {id: updatedPost.id, inputData: forUpdate}})
        setIsModalOpen(false)
        setMode({...mode, isEditing: false})
        document.body.style.overflow = "scroll"
        setUpdatedPost({})
      }
      if (mode.isCreating) {
        await createBlogpost({ variables: {inputData: postObject}})
        setIsModalOpen(false)
        setMode({...mode, isCreating: false})
        document.body.style.overflow = "scroll"
      }
    } 
  }

  let modalTitle = ''
  if (mode.isEditing) {modalTitle = 'Редактирование записи в блоге'}
  if (mode.isCreating) {modalTitle = 'Новая запись в блоге'}
  if (mode.isDeleting) {modalTitle = 'Удаление записи из блога'}

  return (
    <>
    <Header page='blog'/>
   {isModalOpen && <Modal 
      isOpen={isModalOpen}
      title={modalTitle}
      onClose={onCloseModal}
    >
     { (mode.isEditing || mode.isCreating) && <Edit
        onClickSubmit={onChangePostHandler}
        onClickCancel={onCloseModal}
        isAbleToSave={isAbleToSave}
        post={updatedPost}
        formTemplate={FORM_TEMPLATE}
      />}
      {
        (mode.isDeleting) && <div>
          <p>Вы уверены, что хотите удалить эту запись?</p>
          <button className="btn btn-primary" onClick={onDeletePostHandler}>Да</button>
        </div>    
      }
    </Modal>}
    <div className="container">
      {blogposts.map((blogpost, idx) => 
          <Blogpost 
            blogpost = {blogpost} 
            key={blogpost.id} 
            idx={idx} 
            onClickEdit={() => onEditBlogpost(idx)}
            onClickDelete={() => onDeleteBlogpost(idx)}
          />)}
      <Pagination 
        totalPages={totalPages} 
        currentPage={pageNumber} 
        onClickPage={onPaginate}  
        />
    </div>
    <ButtonAddNew
      color='red'
      onClickAddButton={onAddNewBlogpost}
      fixed
      size='4'
      />
    </>
  )
}

export default ErrorBoundry(Blog)
