const request = require('supertest')
const app = require('../src/app')
const User = require('../src/models/user')
const { userOne, userOneId, setupDatabase } = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should signup a new user', async () => {
    const response = await request(app).post('/users')
    .send({
        name: 'Kurt',
        email: 'kurt@example.com',
        password: 'MyPass5678@'
    })
    .expect(201)

    // Assert that the database was changed correctly
    const user = await User.findById(response.body.user._id)
    expect(user).not.toBeNull()

    // Assertions about response body
    expect(response.body).toMatchObject({
        user: {        
            name: 'Kurt',
            email: 'kurt@example.com',            
        },
        token: user.tokens[0].token
    })

    // Assert that plain-text password is not saved to the Db
    expect(user.password).not.toBe('MyPass5678@')
})

test('Should login existing user', async () => {
    const response = await request(app).post('/users/login')
    .send({
        email: userOne.email,
        password: userOne.password
    })
    .expect(200)

    const user = await User.findById(userOneId)

    expect(response.body.token).toBe(user.tokens[1].token)
})

test('Should fail to login nonexistent user', async () => {
    await request(app).post('/users/login')
    .send({
        email: 'onke@example.com',
        password: '12345678'
    })
    .expect(400)
})

test('Should get profile for user', async () => {
    await request(app).get('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200)
})

test('Should not get profile for unauthenticated user', async () => {
    await request(app).get('/users/me')
    .send()
    .expect(401)
})

test('Should delete user account', async () => {
    await request(app).delete('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200)

    const user = await User.findById(userOneId)

    expect(user).toBeNull()
})

test('Should not delete account for unauthenticated user', async () => {
    await request(app).delete('/users/me')
    .send()
    .expect(401)
})

test('Should upload avatar image', async () => {
    await request(app).post('/users/me/avatar')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .attach('avatar', 'tests/fixtures/profile-pic.jpg')
    .expect(200)

    const user = await User.findById(userOneId)
    expect(user.avatar).toEqual(expect.any(Buffer))
})

test('Should update valid user fields', async() => {
    const newName = 'James'

    const response = await request(app).patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({ name: newName })
    .expect(200)

    expect(response.body.name).toBe(newName)
})

test('Should not update invalid user fields', async() => {
    const newLocation = 'Pretoria'

    await request(app).patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({ location: newLocation })
    .expect(400)
})