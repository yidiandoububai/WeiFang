//引入工具包
const express = require('express'); //搭建服务器的工具箱
const mysql = require('mysql2/promise'); //操作数据库的遥控器
const bcrypt = require('bcryptjs'); //密码加密器
const bodyParser = require('body-parser'); //数据解码器

//搭建服务器框架
const app = express();
const port = 3000;

// 数据库配置 连接数据库
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // 改为你的数据库用户
    password: '123456', // 改为你的数据库密码
    database: 'user_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 配置中间件（数据处理器）
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 静态文件服务（存放前端页面）
app.use(express.static('public'));

// 注册路由
app.post('/register', async(req, res) => {
    try {
        // 1. 获取用户输入
        const { username, password } = req.body;
        // 2. 加密密码（加盐哈希）
        const hashedPassword = await bcrypt.hash(password, 10); // 这行必须有
        // 3. 连接数据库
        const connection = await pool.getConnection();
        // 4. 执行SQL插入
        await connection.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)', // SQL语句必须正确
            [username, hashedPassword]
        );
        // 5. 释放连接
        connection.release(); // 这行必须有
        // 6. 返回成功
        res.json({ success: true, message: '注册成功' });
    } catch (err) {
        // 错误处理
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: '用户名已存在' });
        } else {
            console.error("注册错误:", err); // 添加错误日志
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    }
});

// 登录路由
app.post('/login', async(req, res) => {
    try {
        // 1. 获取输入
        const { username, password } = req.body;
        // 2. 连接数据库

        const connection = await pool.getConnection();

        try {
            // 3. 查询用户

            const [rows] = await connection.execute(
                'SELECT * FROM users WHERE username = ?', [username]
            );
            // 4. 用户不存在

            if (rows.length === 0) {
                return res.status(401).json({ success: false, message: '用户名或密码错误' });
            }
            // 5. 验证密码

            const user = rows[0];
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.status(401).json({ success: false, message: '用户名或密码错误' });
            }
            // 6. 登录成功

            res.json({ success: true, message: '登录成功' });
        } finally {
            // 7. 释放连接

            connection.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 页面A路由
app.get('/pageA.html', (req, res) => {
    res.sendFile(__dirname + '/pageA.html');
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});