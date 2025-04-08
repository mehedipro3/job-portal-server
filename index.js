const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const logger = (req, res, next) => {
  console.log('insider the logger');
  next();
}


const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    res.user = decode;
    next();
  })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ee44r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //jobs related jobs
    const jobsCollection = client.db('job-portal').collection('jobs');
    const jobApplicationCollection = client.db('job-portal').collection('job_application');


    //Auth related APIs

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
      })
        .send({ success: true });
    })
     

    //Token delete 

    app.post('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: false,
      })
        .send({ success: true })
    })

    //job related APIs
    app.get("/job", logger, async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    })



    app.post("/job", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    })

    app.get('/job-application/job/:job_id', async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId };
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    })

    //job-application apis

    app.get("/job-application", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { application_email: email };

      console.log('cuk cuk cookies', req.cookies);

      if (res.user.email !== req.query.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const result = await jobApplicationCollection.find(query).toArray();

      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) }
        const job = await jobsCollection.findOne(query1);
        if (job) {
          application.title = job.title;
          application.company = job.company;
          application.applicationDeadline = job.applicationDeadline;
          application.company_logo = job.company_logo;
          application.location = job.location;
        }
      }
      res.send(result);
    })

    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);
      res.send(result);
    })


    app.patch("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: data.status
        }
      }
      const result = await jobApplicationCollection.updateOne(filter, updateDoc);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  }




  finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("job is falling in the sky");
})

app.listen(port, () => {
  console.log(`Job is waiting at: ${port}`);
})