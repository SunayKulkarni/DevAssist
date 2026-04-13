import mongoose from "mongoose";


const projectSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true, 
        unique: [true, 'Project name must be unique'], 
    },
    users: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "user"
        // required: false
    },
    files: {
        type: Object,
        default: {},
        description: "File tree structure for the project"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
projectSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Project = mongoose.model("Project", projectSchema);

export default Project;