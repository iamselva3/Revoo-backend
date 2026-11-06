import { Request, Response } from 'express';
import { EmployeeModel } from '../../infrastructure/database/models/Employee.js';

export class EmployeeController {
  /**
   * GET /api/v1/employees
   * List all employees with filters for district, status, role, search
   */
  static async listEmployees(req: Request, res: Response) {
    try {
      const q = (req.query.q as string || '').trim();
      const district = (req.query.district as string || '').trim();
      const status = (req.query.status as string || '').trim();
      const role = (req.query.role as string || '').trim();

      const filter: any = {};

      if (district && district !== 'ALL') {
        filter.district = { $regex: `^${district}$`, $options: 'i' };
      }
      if (status && status !== 'ALL') {
        filter.status = status;
      }
      if (role && role !== 'ALL') {
        filter.role = role;
      }
      if (q) {
        filter.$or = [
          { fullName: { $regex: q, $options: 'i' } },
          { employeeCode: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
          { district: { $regex: q, $options: 'i' } },
          { assignedPincodes: { $in: [q] } },
        ];
      }

      const employees = await EmployeeModel.find(filter)
        .sort({ completedPickups: -1, rating: -1, createdAt: -1 })
        .limit(200);

      // District statistics
      const totalCount = await EmployeeModel.countDocuments();
      const activeCount = await EmployeeModel.countDocuments({ status: 'ACTIVE' });
      const distinctDistricts = await EmployeeModel.distinct('district');

      return res.status(200).json({
        success: true,
        count: employees.length,
        stats: {
          total: totalCount,
          active: activeCount,
          districtsCovered: distinctDistricts.length,
        },
        data: employees,
      });
    } catch (err) {
      console.error('[EmployeeController] listEmployees error:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve employees' });
    }
  }

  /**
   * GET /api/v1/employees/recommend
   * Smart Staff Recommendation based on customer request PIN code and district
   */
  static async recommendStaff(req: Request, res: Response) {
    try {
      const pincode = (req.query.pincode as string || '').trim();
      const district = (req.query.district as string || '').trim();
      const city = (req.query.city as string || '').trim();

      const results: any[] = [];
      const seenIds = new Set<string>();

      // 1. Exact PIN code match (Top recommendation)
      if (pincode) {
        const pinMatches = await EmployeeModel.find({
          status: { $in: ['ACTIVE', 'ON_DUTY'] },
          assignedPincodes: pincode,
        }).limit(10);

        for (const emp of pinMatches) {
          seenIds.add(emp._id.toString());
          results.push({
            ...emp.toObject(),
            matchType: 'EXACT_PINCODE_MATCH',
            matchBadge: `✓ Recommended: Assigned to PIN ${pincode}`,
            confidence: 100,
          });
        }
      }

      // 2. District or City Hub match
      const targetDistrict = district || city;
      if (targetDistrict) {
        const districtMatches = await EmployeeModel.find({
          status: { $in: ['ACTIVE', 'ON_DUTY'] },
          $or: [
            { district: { $regex: targetDistrict, $options: 'i' } },
            { groupName: { $regex: targetDistrict, $options: 'i' } },
          ],
        }).limit(15);

        for (const emp of districtMatches) {
          if (!seenIds.has(emp._id.toString())) {
            seenIds.add(emp._id.toString());
            results.push({
              ...emp.toObject(),
              matchType: 'DISTRICT_HUB_MATCH',
              matchBadge: `Nearby: ${emp.district} Flying Squad`,
              confidence: 85,
            });
          }
        }
      }

      // 3. Fallback to active partners in Tamil Nadu if none found
      if (results.length < 5) {
        const fallbacks = await EmployeeModel.find({
          status: 'ACTIVE',
          _id: { $nin: Array.from(seenIds) },
        })
          .sort({ completedPickups: -1, rating: -1 })
          .limit(8);

        for (const emp of fallbacks) {
          results.push({
            ...emp.toObject(),
            matchType: 'GENERAL_ACTIVE_STAFF',
            matchBadge: `${emp.district} Partner (Available)`,
            confidence: 60,
          });
        }
      }

      return res.status(200).json({
        success: true,
        count: results.length,
        query: { pincode, district, city },
        data: results,
      });
    } catch (err) {
      console.error('[EmployeeController] recommendStaff error:', err);
      return res.status(500).json({ success: false, message: 'Failed to recommend staff' });
    }
  }

  /**
   * POST /api/v1/employees
   * Add a new collection personnel / pickup partner
   */
  static async createEmployee(req: Request, res: Response) {
    try {
      const {
        fullName,
        phone,
        email,
        district,
        state = 'Tamil Nadu',
        assignedPincodes = [],
        role = 'PICKUP_PARTNER',
        groupName,
        status = 'ACTIVE',
        vehicleType = 'BIKE',
      } = req.body;

      if (!fullName || !phone || !district) {
        return res.status(400).json({ success: false, message: 'Name, phone, and district are required' });
      }

      // Generate next employee code
      const total = await EmployeeModel.countDocuments();
      const employeeCode = `REV-TN-${String(total + 1).padStart(3, '0')}`;

      const newEmp = await EmployeeModel.create({
        fullName,
        employeeCode,
        phone,
        email: email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@revoo.com`,
        state,
        district,
        assignedPincodes: Array.isArray(assignedPincodes)
          ? assignedPincodes
          : String(assignedPincodes).split(',').map((p) => p.trim()).filter(Boolean),
        role,
        groupName: groupName || `${district} Regional Squad`,
        status,
        vehicleType,
        completedPickups: 0,
        rating: 5.0,
      });

      return res.status(201).json({ success: true, message: 'Pickup partner created successfully', data: newEmp });
    } catch (err: any) {
      console.error('[EmployeeController] createEmployee error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Failed to create employee' });
    }
  }

  /**
   * PUT /api/v1/employees/:id
   * Update employee details
   */
  static async updateEmployee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.assignedPincodes && typeof updates.assignedPincodes === 'string') {
        updates.assignedPincodes = updates.assignedPincodes.split(',').map((p: string) => p.trim()).filter(Boolean);
      }

      const updated = await EmployeeModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      return res.status(200).json({ success: true, message: 'Employee updated successfully', data: updated });
    } catch (err: any) {
      console.error('[EmployeeController] updateEmployee error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Failed to update employee' });
    }
  }

  /**
   * DELETE /api/v1/employees/:id
   * Remove or inactivate employee
   */
  static async deleteEmployee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await EmployeeModel.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      return res.status(200).json({ success: true, message: 'Employee removed successfully' });
    } catch (err) {
      console.error('[EmployeeController] deleteEmployee error:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete employee' });
    }
  }
}

