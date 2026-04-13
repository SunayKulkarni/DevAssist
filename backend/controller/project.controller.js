import projectModel from '../models/project.model.js'
import * as projectService from '../services/project.service.js'
import userModel from '../models/user.model.js'
import { validationResult } from 'express-validator'


export const createProject = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try{
        const {name}=req.body;
        const loggedInUser = await userModel.findOne({ email: req.user.email})
        const userId = loggedInUser._id;
        const newProject = await projectService.createProject({ name, userId })
        // Fetch the full project with populated users
        const fullProject = await projectModel.findById(newProject._id).populate('users');
        res.status(201).json({ project: fullProject });
    }
    catch(err){
        console.log(err)
        res.status(400).send(err.message)
    }
}

export const getAllProject = async (req, res) => {
    try{
        const loggedInUser = await userModel.findOne({ email: req.user.email})  

        const allUserProjects = await projectService.getAllProjectByUserId({ 
            userId: loggedInUser._id 
        })

        return res.status(200).json({
            projects: allUserProjects
        })

    }
    catch(err){
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }


    try{
        const { projectId, users} = req.body;

        const loggedInUser = await userModel.findOne({ email: req.user.email})

        const project = await projectService.addUsersToProject({
            projectId,
            users,
            userId: loggedInUser._id
        });

        return res.status(200).json({
            project
        });

    }
    catch(err){
        console.log(err)
        res.status(400).json({ error: err.message })
    }


}

export const getProjectById = async (req, res) => { 
    const { projectId } = req.params;
    
    try{
        const project = await projectService.getProjectById({ projectId });
        return res.status(200).json({project});
    }
    catch(err){
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const updateProjectFiles = async (req, res) => {
    const { projectId } = req.params;
    const { files } = req.body;

    try {
        if (!files || typeof files !== 'object') {
            return res.status(400).json({ error: 'Files must be a valid object' });
        }

        const loggedInUser = await userModel.findOne({ email: req.user.email });
        const project = await projectModel.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is part of the project
        if (!project.users.includes(loggedInUser._id) && project.users[0].toString() !== loggedInUser._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized to update this project' });
        }

        project.files = files;
        await project.save();

        return res.status(200).json({ 
            message: 'Project files updated successfully',
            project 
        });
    } catch (err) {
        console.error('Error updating project files:', err);
        res.status(500).json({ error: err.message });
    }
}